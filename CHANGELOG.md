## 2.0.1

Do not use `autoReconnect` feature if a replica set or sharded cluster is present, per mongodb team. It will already reconnect if needed, and the `autoReconnect` feature actually breaks this by reconnecting stubbornly to the one node that's down.

## 2.0.0

Initial release, with passing unit tests.
