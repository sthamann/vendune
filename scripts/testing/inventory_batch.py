"""Concurrent two-product allocation/release on the actual HTTP path, reused by strict runtime verification."""
import concurrent.futures
import copy
import uuid


def verify(call, bases, owner, tenant):
    shopper = {'x-tenant': tenant}
    initial = {pid: call(bases[0], '/store-api/product/'+pid, h=shopper)['product']['stock'] for pid in ['lamp','mug']}
    carts = []
    for index in range(2):
        base = bases[index]
        cart = call(base, '/store-api/checkout/cart', {'session':uuid.uuid4().hex}, shopper)
        h = {**shopper, 'sw-context-token':cart['token'], 'Idempotency-Key':uuid.uuid4().hex}
        items = [{'referencedId':'lamp','quantity':1}, {'referencedId':'mug','quantity':2}]
        call(base, '/store-api/checkout/cart/line-item', {'items':items if index==0 else items[::-1]}, h)
        carts.append((base,h))
    def checkout(pair):
        return call(pair[0], '/store-api/checkout/order', {}, pair[1])
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        orders = list(pool.map(checkout,carts))
    assert len({order['id'] for order in orders}) == 2
    for pid, quantity in [('lamp',2),('mug',4)]:
        assert call(bases[1], '/store-api/product/'+pid, h=shopper)['product']['stock'] == initial[pid]-quantity
    def cancel(pair):
        index, order = pair
        base = bases[index]
        h = {**owner, 'Idempotency-Key':uuid.uuid4().hex}
        current = call(base, '/api/merchant/orders/'+order['id'], h=h)
        body = {'kind':'order','state':'cancelled','revision':current['revision']}
        call(base, '/api/merchant/orders/'+order['id']+'/transition', body, h)
        call(bases[1-index], '/api/merchant/orders/'+order['id']+'/transition', body, h)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(cancel,enumerate(orders)))
    for pid in initial:
        assert call(bases[1], '/store-api/product/'+pid, h=shopper)['product']['stock'] == initial[pid]
    print('PASS opposite-order multi-product checkouts and concurrent idempotent cancellations restore exact stock across replicas')


def verify_content(call, bases, owner, tenant):
    """A real purchase can race a content edit, but never an absolute stock write."""
    path = '/api/merchant/products/mug'
    initial = call(bases[0], path, h=owner)
    content = copy.deepcopy(initial)
    content['contentRevision'] = initial.get('contentRevision', initial['revision'])
    content['commerce'].pop('stock')
    content['translations']['en']['description'] = 'Edited while a shopper purchases'
    shopper = {'x-tenant': tenant}
    cart = call(bases[0], '/store-api/checkout/cart', {'session': uuid.uuid4().hex}, shopper)
    checkout = {**shopper, 'sw-context-token': cart['token'], 'Idempotency-Key': uuid.uuid4().hex}
    call(bases[0], '/store-api/checkout/cart/line-item', {'items': [{'referencedId': 'mug', 'quantity': 1}]}, checkout)
    order = call(bases[0], '/store-api/checkout/order', {}, checkout)
    saved = call(bases[1], path, content, owner, 'PUT')
    current = call(bases[0], path, h=owner)
    assert current['commerce']['stock'] == initial['commerce']['stock'] - 1
    assert saved['revision'] == current['revision'] > initial['revision']
    assert saved['contentRevision'] == current['contentRevision'] > initial['contentRevision']
    assert current['translations']['en']['description'] == content['translations']['en']['description']
    # Current aggregate revision cannot conceal a stale content revision.
    content['revision'] = current['revision']
    failure = call(bases[0], path, content, owner, 'PUT', 409)['errors'][0]
    assert failure['pointer'] == '/contentRevision' and failure['currentRevision'] == current['contentRevision']
    # Explicit stock writes and legacy aggregate saves still require current aggregate CAS.
    initial['contentRevision'] = current['contentRevision']
    failure = call(bases[1], path, initial, owner, 'PUT', 409)['errors'][0]
    assert failure['pointer'] == '/revision' and failure['currentRevision'] == current['revision']
    # Return the actual allocation through the native cancellation path; content CAS stays stable.
    call(bases[1], '/api/merchant/orders/' + order['id'] + '/transition',
         {'kind': 'order', 'state': 'cancelled', 'revision': order['revision']},
         {**owner, 'Idempotency-Key': uuid.uuid4().hex})
    after = call(bases[0], path, h=owner)
    assert after['commerce']['stock'] == initial['commerce']['stock']
    assert after['contentRevision'] == current['contentRevision']
    call(bases[0], path, current, owner, 'PUT', 409)
    current['commerce'].pop('stock')
    response = call(bases[0], '/mcp', {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
        'params': {'name': 'merchant.product.save', 'arguments': {'id': 'mug', 'product': current}}}, owner)
    assert 'error' not in response and not response['result'].get('isError'), response
    assert call(bases[0], path, h=owner)['commerce']['stock'] == initial['commerce']['stock']
    print('PASS checkout and cancellation preserve content CAS; content-only saves cannot restore purchased stock and explicit stale stock writes fail across replicas')
