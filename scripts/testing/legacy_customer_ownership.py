"""Historical guest snapshots never grant account ownership from an unverified email."""
import os
import subprocess
import uuid
from testing.database import psql


def check_legacy_customer(req, owner, public, original, asset, content):
    if not os.getenv('TEST_DATABASE'):
        return
    tag = uuid.uuid4().hex
    order, cart, token = 'legacy-order-' + tag, 'legacy-cart-' + tag, 'legacy-token-' + tag
    email = 'legacy-' + tag + '@example.test'
    tenant = owner['x-tenant']
    # Seed only the disposable database with an authentic pre-customer-ID shape.
    sql = f"""BEGIN; SET LOCAL rac.system='on';
    INSERT INTO carts(id,tenant,token,data,status)
      SELECT '{cart}',tenant,'{token}',jsonb_set(data-'customer_id','{{email}}',to_jsonb('{email}'::text)),'ordered'
      FROM carts WHERE tenant='{tenant}' AND id=(SELECT cart_id FROM orders WHERE tenant='{tenant}' AND id='{original}');
    INSERT INTO orders(id,tenant,cart_id,idempotency_key,fingerprint,data)
      SELECT '{order}',tenant,'{cart}','legacy-key-{tag}','fixture',
        jsonb_set(jsonb_set(data-'orderCustomer','{{id}}',to_jsonb('{order}'::text)),'{{cart,id}}',to_jsonb('{cart}'::text))
      FROM orders WHERE tenant='{tenant}' AND id='{original}';
    INSERT INTO order_downloads(tenant,order_id,asset_id)
      SELECT tenant,'{order}',asset_id FROM order_downloads WHERE tenant='{tenant}' AND order_id='{original}' AND asset_id='{asset}'; COMMIT;"""
    subprocess.run(psql(os.environ['TEST_DB_CONTAINER'], 'commerce', os.environ['TEST_DATABASE'], '-v', 'ON_ERROR_STOP=1'), input=sql, text=True, check=True, stdout=subprocess.DEVNULL)
    account = req('/store-api/account/register', {'email': email, 'name': 'Unverified legacy claimant',
                  'password': 'Synthetic-legacy-claim-2026!'}, public)
    claimant = {**public, 'x-customer-token': account['customerToken']}
    assert req('/store-api/account/orders', h=claimant)['elements'] == []
    req('/store-api/account/orders/' + order, h=claimant, expected=404)
    assert req('/store-api/account/downloads', h=claimant)['elements'] == []
    path = '/store-api/orders/' + order + '/downloads/' + asset
    req(path, h=claimant, expected=404)
    assert req(path, h={**public, 'sw-context-token': token}, binary=True) == content
    req(path, h={**public, 'sw-context-token': 'wrong-' + token}, expected=404)
    native = req('/api/merchant/orders/' + order, h=owner)
    receipt = req('/api/merchant/orders/' + order + '/receipts',
                  {'revision': native['revision'], 'kind': 'invoice', 'locale': 'en', 'requestKey': 'legacy-receipt-' + tag}, owner)
    req('/store-api/account/orders/' + order + '/receipts/' + receipt['id'] + '/pdf', h=claimant, expected=404)
    assert req('/api/merchant/receipts/' + receipt['id'] + '/pdf', h=owner, binary=True).startswith(b'%PDF')
    print('PASS legacy email-only orders, invoices and downloads deny a new claimant; exact original cart proof and admitted merchant access remain intact')
