"""Real transport/permission regressions for knowledge publication and automation discovery."""


def check_consistency_boundaries(request, role, invite, headers, owner_headers):
    role("knowledge_release", ["knowledge.read", "knowledge.write",
                              "environments.read", "environments.manage"])
    writer = invite("knowledge_release", "knowledge-release")
    wh = headers(writer)
    stage = request("/api/environments", {"name": "Knowledge publication"}, wh)["id"]
    sh = {**wh, "x-tenant": stage}
    source = request("/api/knowledge/documents", {
        "title": "Private staging source", "content": "Synthetic private policy.", "kind": "faq"
    }, sh)
    change = next(c for c in request("/api/environments/" + stage + "/diff", h=wh)["changes"]
                  if c["key"] == "document:" + source["id"])
    assert change["after"]["content"] == "Synthetic private policy."

    role("catalog_diff", ["catalog.read", "environments.read", "environments.manage"])
    reader = invite("catalog_diff", "catalog-diff")
    rh = headers(reader)
    request("/api/knowledge/documents/" + source["id"], h={**rh, "x-tenant": stage}, expected=403)
    assert not any(c["key"] == change["key"] for c in
                   request("/api/environments/" + stage + "/diff", h=rh)["changes"])
    selection = {"approve": True, "selections": [{"key": change["key"], "digest": change["digest"]}]}
    request("/api/environments/" + stage + "/release", selection, rh, expected=403)
    request("/api/knowledge/documents/" + source["id"], h=owner_headers, expected=404)
    request("/api/environments/" + stage + "/release", selection, wh)
    live = request("/api/knowledge/documents/" + source["id"], h=wh)
    assert live["content"] == "Synthetic private policy.", live
    assert request("/api/history/source/" + source["id"], h=wh)["elements"][0]["actor"] == writer["user"]["id"]
    print("PASS knowledge-only stage diff/publication and history; catalog rights cannot read or release private sources")

    def tools(h):
        return {t["name"] for t in request("/mcp", {
            "jsonrpc": "2.0", "id": 1, "method": "tools/list"
        }, h)["result"]["tools"]}

    def invoke(h, name, args):
        return request("/mcp", {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                               "params": {"name": name, "arguments": args}}, h)["result"]

    history_tools = {"merchant.history", "merchant.history.version", "merchant.history.restore"}
    role("history_write_only", ["knowledge.write"])
    hw = headers(invite("history_write_only", "history-write-only"))
    request("/api/history/source/" + source["id"], h=hw, expected=403)
    assert not history_tools & tools(hw), "Write-only role advertises unusable history operations"
    role("history_without_pii", ["orders.read", "customers.read", "b2b.read", "b2b.manage"])
    hp = headers(invite("history_without_pii", "history-without-pii"))
    request("/api/history/source/" + source["id"], h=hp, expected=403)
    assert not history_tools & tools(hp), "Missing PII grant still advertises private history"
    assert history_tools <= tools(wh)
    history = invoke(wh, "merchant.history", {"entity": "source", "id": source["id"]})
    assert not history["isError"] and history["structuredContent"]["elements"]
    role("history_read_only", ["knowledge.read"])
    hr = headers(invite("history_read_only", "history-read-only"))
    assert {"merchant.history", "merchant.history.version"} <= tools(hr)
    assert "merchant.history.restore" not in tools(hr)
    print("PASS history discovery requires the same read/write/PII conjunctions as native invocation")

    role("automation_writer", ["automation.manage"])
    ah = headers(invite("automation_writer", "automation-writer"))
    assert {"automation.import", "automation.save", "automation.delete"} <= tools(ah)
    assert not {"automation.catalog", "automation.preview", "automation.list"} & tools(ah)
    condition = {"type": "alwaysValid"}
    http = request("/api/automation/import-condition", condition, ah)
    mcp = invoke(ah, "automation.import", {"condition": condition})
    assert not mcp["isError"] and mcp["structuredContent"] == http
    request("/api/automation/catalog", h=ah, expected=403)

    role("channel_writer", ["channels.manage"])
    ch = headers(invite("channel_writer", "channel-writer"))
    assert {"automation.save", "automation.delete"} <= tools(ch)
    assert not {"automation.catalog", "automation.preview", "automation.import", "automation.list"} & tools(ch)
    request("/api/automation/import-condition", condition, ch, expected=403)
    assert invoke(ch, "automation.import", {"condition": condition})["isError"]
    channel = {"name": {"en-GB": "Transport channel"}, "kind": "headless",
               "active": True, "locales": ["en-GB"], "productIds": []}
    created = invoke(ch, "automation.save", {
        "kind": "channels", "id": "transport_channel", "revision": 0, "data": channel
    })
    assert not created["isError"], created
    forbidden = {"kind": "rules", "id": "forbidden_transport", "revision": 0,
                 "data": {"name": {"en-GB": "Denied"}, "condition": condition, "active": True}}
    request("/api/automation/rules/forbidden_transport", forbidden, ch, "PUT", 403)
    assert invoke(ch, "automation.save", forbidden)["isError"]

    role("channel_reader", ["channels.read"])
    cr = headers(invite("channel_reader", "channel-reader"))
    assert {"automation.list", "automation.dependencies"} <= tools(cr)
    assert not {"automation.catalog", "automation.preview", "automation.import", "automation.save", "automation.delete"} & tools(cr)
    request("/api/automation/catalog", h=cr, expected=403)
    assert invoke(cr, "automation.catalog", {})["isError"]
    print("PASS HTTP/MCP automation parity for write-only roles; channel tools cannot advertise or invoke unrelated rule actions")
