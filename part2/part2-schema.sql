-- Part 2 — Access control schema (PostgreSQL)
-- Nothing here is product-specific: resources are keyed (resource_type, resource_id).

-- ============================================================
-- HIERARCHY DEFINITION
-- ============================================================

-- A named tree. An org can have several (Sales Territory, Brand Structure, ...).
CREATE TABLE hierarchies (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT
);

-- The level names the admin invents. Ordered by depth. Adding a level = 1 INSERT.
CREATE TABLE hierarchy_levels (
    id           BIGSERIAL PRIMARY KEY,
    hierarchy_id BIGINT NOT NULL REFERENCES hierarchies(id),
    depth        INT    NOT NULL,           -- 0 = root rank
    name         TEXT   NOT NULL,           -- 'Division', 'Country', 'Salesperson'
    UNIQUE (hierarchy_id, depth)
);

-- The actual boxes in the tree. Adjacency list => arbitrary depth, no migration.
CREATE TABLE nodes (
    id           BIGSERIAL PRIMARY KEY,
    hierarchy_id BIGINT NOT NULL REFERENCES hierarchies(id),
    parent_id    BIGINT REFERENCES nodes(id),      -- NULL = root
    level_id     BIGINT REFERENCES hierarchy_levels(id),
    name         TEXT   NOT NULL,                  -- 'EMEA', 'Germany', 'Alice'
    delegated    BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE => children see only what parent grants down
    path         TEXT                              -- denormalized '/1/7/23/' for fast subtree reads (optional)
);
CREATE INDEX ON nodes (parent_id);
CREATE INDEX ON nodes (hierarchy_id);

-- ============================================================
-- USERS / ROLES / ASSIGNMENTS
-- ============================================================

CREATE TABLE users (
    id    BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
);

-- Just a label. Permissions live in field_policies, not here.
CREATE TABLE roles (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE          -- 'sales', 'manager', 'finance'
);

-- A user gets access AT a node. Many rows per user = "multiple assignments".
CREATE TABLE node_assignments (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    node_id             BIGINT NOT NULL REFERENCES nodes(id),
    role_id             BIGINT REFERENCES roles(id),          -- role held AT this node -> drives column visibility
    include_descendants BOOLEAN NOT NULL DEFAULT TRUE,        -- assignment cascades to subtree
    UNIQUE (user_id, node_id)
);

-- ============================================================
-- ROW-LEVEL: tags + top-down delegation
-- ============================================================

-- Pin a resource to a box. A resource can be pinned to several boxes.
CREATE TABLE resource_tags (
    id            BIGSERIAL PRIMARY KEY,
    node_id       BIGINT NOT NULL REFERENCES nodes(id),
    resource_type TEXT   NOT NULL,          -- 'product', 'order', 'delivery'
    resource_id   TEXT   NOT NULL,          -- SKU / order id / ...
    UNIQUE (node_id, resource_type, resource_id)
);
CREATE INDEX ON resource_tags (resource_type, resource_id);

-- Parent hands specific things down to a descendant. Only consulted when
-- crossing a node where delegated = TRUE.
CREATE TABLE node_grants (
    id              BIGSERIAL PRIMARY KEY,
    grantor_node_id BIGINT NOT NULL REFERENCES nodes(id),   -- the parent
    grantee_node_id BIGINT NOT NULL REFERENCES nodes(id),   -- a descendant
    resource_type   TEXT   NOT NULL,
    resource_id     TEXT,                                   -- a specific resource ...
    tag_node_id     BIGINT REFERENCES nodes(id),            -- ... OR "everything tagged to this box"
    effect          TEXT NOT NULL DEFAULT 'allow'
                    CHECK (effect IN ('allow', 'deny')),    -- deny = carve-out inside a broader allow
    CHECK ( (resource_id IS NOT NULL) <> (tag_node_id IS NOT NULL) )  -- exactly one
);
CREATE INDEX ON node_grants (grantee_node_id, resource_type);

-- ============================================================
-- COLUMN-LEVEL: which fields a user may view
-- ============================================================

CREATE TABLE field_policies (
    id            BIGSERIAL PRIMARY KEY,
    resource_type TEXT NOT NULL,
    field_name    TEXT NOT NULL,                    -- 'price', 'stock', 'cost', 'margin'
    role_id       BIGINT REFERENCES roles(id),
    level_id      BIGINT REFERENCES hierarchy_levels(id),
    node_id       BIGINT REFERENCES nodes(id),
    effect        TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    CHECK (role_id IS NOT NULL OR level_id IS NOT NULL OR node_id IS NOT NULL)
);

-- Fallback when no field_policy matches. Default deny = whitelist model.
CREATE TABLE field_defaults (
    resource_type   TEXT PRIMARY KEY,
    default_effect  TEXT NOT NULL DEFAULT 'deny' CHECK (default_effect IN ('allow', 'deny')),
    always_allowed  TEXT[] NOT NULL DEFAULT '{}'  -- identity fields, e.g. {sku,name}
);

-- ============================================================
-- OVERRIDES: admin's manual switches, per user + per resource
-- ============================================================

CREATE TABLE access_overrides (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id),
    resource_type TEXT   NOT NULL,
    resource_id   TEXT   NOT NULL,
    effect        TEXT   NOT NULL CHECK (effect IN ('allow', 'deny')),
    reason        TEXT,
    created_by    BIGINT REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, resource_type, resource_id)
);


-- ============================================================
-- SEED DATA — the Carol example
-- ============================================================

INSERT INTO hierarchies (id, name) VALUES (1, 'Sales Territory');

INSERT INTO hierarchy_levels (id, hierarchy_id, depth, name) VALUES
    (1, 1, 0, 'Division'),
    (2, 1, 1, 'Country'),
    (3, 1, 2, 'Salesperson');

--  1 EMEA (delegated)      6 APAC
--   ├─2 Germany            └─7 Japan
--   │  └─4 Alice
--   └─3 France
--      └─5 Bob
INSERT INTO nodes (id, hierarchy_id, parent_id, level_id, name, delegated) VALUES
    (1, 1, NULL, 1, 'EMEA',    TRUE),
    (2, 1, 1,    2, 'Germany', FALSE),
    (3, 1, 1,    2, 'France',  FALSE),
    (4, 1, 2,    3, 'Alice',   FALSE),
    (5, 1, 3,    3, 'Bob',     FALSE),
    (6, 1, NULL, 1, 'APAC',    FALSE),
    (7, 1, 6,    2, 'Japan',   FALSE);

INSERT INTO users (id, email) VALUES (10, 'carol@example.com');

INSERT INTO roles (id, name) VALUES (1, 'sales'), (2, 'manager');

-- Carol: sales in Germany, manager in France  (multiple assignments, different roles)
INSERT INTO node_assignments (user_id, node_id, role_id) VALUES
    (10, 2, 1),
    (10, 3, 2);

-- Products pinned to boxes
INSERT INTO resource_tags (node_id, resource_type, resource_id) VALUES
    (2, 'product', 'SKU-100'),   -- Widget    -> Germany
    (2, 'product', 'SKU-101'),   -- Gadget    -> Germany
    (3, 'product', 'SKU-102'),   -- Sprocket  -> France
    (1, 'product', 'SKU-103'),   -- Gizmo     -> EMEA (division-wide)
    (7, 'product', 'SKU-200');   -- Doohickey -> Japan

-- EMEA (delegated) hands things down
INSERT INTO node_grants (grantor_node_id, grantee_node_id, resource_type, resource_id, tag_node_id, effect) VALUES
    (1, 2, 'product', NULL,      2,    'allow'),   -- G1: Germany gets everything tagged to Germany
    (1, 2, 'product', 'SKU-103', NULL, 'allow'),   -- G2: Germany also gets Gizmo
    (1, 2, 'product', 'SKU-101', NULL, 'deny'),    -- G3: ...but NOT Gadget
    (1, 3, 'product', NULL,      3,    'allow');   -- G4: France gets everything tagged to France
                                                  --     (EMEA says nothing about Gizmo for France)

-- Column rules
INSERT INTO field_defaults (resource_type, default_effect, always_allowed) VALUES
    ('product', 'deny', '{sku,name}');

INSERT INTO field_policies (resource_type, field_name, role_id, effect) VALUES
    ('product', 'price',  1, 'allow'),   -- sales   -> price, stock
    ('product', 'stock',  1, 'allow'),
    ('product', 'price',  2, 'allow'),   -- manager -> price, stock, cost, margin
    ('product', 'stock',  2, 'allow'),
    ('product', 'cost',   2, 'allow'),
    ('product', 'margin', 2, 'allow');
    -- cost/margin have no 'sales' allow -> default deny hides them from a salesperson

-- Admin's manual switches, just for Carol
INSERT INTO access_overrides (user_id, resource_type, resource_id, effect, reason) VALUES
    (10, 'product', 'SKU-100', 'deny',  'conflict of interest'),
    (10, 'product', 'SKU-200', 'allow', 'one-off cross-region deal');
