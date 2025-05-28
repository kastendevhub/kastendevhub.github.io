---
layout: post
title: Granular Table Restore with Kasten K10
description: When it comes to database backup and recovery, the ability to perform granular restores is essential. This post demonstrates how to leverage Kasten K10 to implement PostgreSQL granular table restores using custom Kanister blueprints and volume cloning techniques.
date: 2025-05-28 00:00:35 +0300
author: michaelcourcy
image: '/images/posts/2025-05-28-postgres-kasten-granular-table-restore/pick-tables.png'
image_caption: 'Granular Table Restore with Kasten K10'
tags: [Posgres, Backup, Kasten, granular, tables]
featured:
---

## Setting Up PostgreSQL with Bitnami Helm Chart

First, let's install a PostgreSQL database using the Bitnami Helm chart:

```
# Create a namespace for our PostgreSQL instance
kubectl create namespace postgres-demo

# Install PostgreSQL using Helm
helm install postgres16 oci://registry-1.docker.io/bitnamicharts/postgresql \
  --namespace postgres-demo \
  --set auth.postgresPassword=your-secure-password
```

Verify that the PostgreSQL pod is running:

```
kubectl get pods -n postgres-demo
```

## Creating a Database with Sample Data

Connect to the PostgreSQL instance and create a sample database with tables:

```
kubectl exec -n postgres-demo -it postgres16-postgresql-0 -- bash
export PGHOST='localhost'
export PGUSER='postgres'
export PGPASSWORD='your-secure-password'
psql 
CREATE DATABASE testdb;
\c testdb
CREATE TABLE customers (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100));
INSERT INTO customers (name, email) VALUES ('John Doe', 'john@example.com'), ('Jane Smith', 'jane@example.com');
SELECT * FROM customers;
```

# Custom Blueprint for Granular Backup

Kasten K10 uses Kanister blueprints to define how applications should be backed up. For PostgreSQL, we'll use a custom blueprint that creates individual binary dumps for each database, enabling granular restore capabilities:

```
apiVersion: cr.kanister.io/v1alpha1
kind: Blueprint
metadata:
  name: postgres-pg-dump
  namespace: kasten-io
actions:
  beforeBackup:
    kind: StatefulSet
    phases:
    - name: pgDumpall
      func: KubeExec
      objects:
        pgSecret:
          kind: Secret
          name: 'postgres16-postgresql'
          namespace: '{{{{}} .StatefulSet.Namespace {{}}}}'
      args:
        pod: "{{{{}} index .StatefulSet.Pods 0 {{}}}}"
        namespace: '{{{{}} .StatefulSet.Namespace {{}}}}'
        command:
        - bash
        - -o
        - errexit
        - -o
        - pipefail
        - -c
        - |
          export PGHOST='localhost'
          export PGUSER='postgres'
          export PGPASSWORD='{{{{}} index .Phases.pgDumpall.Secrets.pgSecret.Data "postgres-password" | toString {{}}}}'
          mkdir -p /bitnami/postgresql/backups
          
          # Back up global objects (roles, tablespaces) in plain text
          pg_dumpall --globals-only > /bitnami/postgresql/backups/globals.sql
          
          # Get a list of user databases (excluding system databases)
          databases=$(psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres')")

          # Back up each database in binary format
          for db in $databases; do
            pg_dump -U postgres -Fc $db > /bitnami/postgresql/backups/${db}.dump
          done
```

Apply this blueprint to your cluster:

## Understanding the Blueprint 

The blueprint performs several key actions:

- Connects to PostgreSQL using credentials from the PostgreSQL secret
- Creates separate dumps for global objects (users, roles) in plain text format
- Identifies all user databases by querying `pg_database`
- Creates individual binary dumps (using the `-Fc` custom format) for each database


The binary format (`-Fc`) is critical because it allows us to perform selective table restores later using the pg_restore tool, unlike plain SQL dumps that would require parsing.

## Creating a Backup Policy in Kasten K10

With our blueprint in place, create a backup policy in Kasten K10 that uses it:

1. In the Kasten K10 dashboard, navigate to Policies and click Create New Policy
2. Name your policy (e.g., "PostgreSQL-Granular-Backup")
3. Select your PostgreSQL application as the target
4. Choose an export target this is madatory for volume clone restore
4. Under Advanced Settings > Action Hooks, select your custom blueprint and the action `beforeBackup`
5. Choose the workload stefulset/postgres16-postgresql

![Advanced actions](../images/posts/2025-05-28-postgres-kasten-granular-table-restore/advanced-actions.png)

Create and run the policy.

## Performing Granular Table Restore

When you need to restore a single table, Kasten K10 performs a volume clone restore that creates a new PVC with the backup date as a suffix. Here's how to leverage this for granular restores:

1. Run a restore operation from Kasten K10.    
   - Navigate to the restpoint you want to restore
   - Select "Restore" and choose volume clone restore 
   - Select the pvc 
   - Click restore 

![Volume clone restore](../images/posts/2025-05-28-postgres-kasten-granular-table-restore/volume-clone-restore.png)

You'll see a new PVC with a name like `data-postgres16-postgresql-0-2025-05-28-15-13-41`

2. Patch the StatefulSet to mount the new PVC temporarily:

```
kubectl patch statefulset postgres16-postgresql -n postgres-demo --patch '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "postgresql",
          "volumeMounts": [{
            "name": "restore-volume",
            "mountPath": "/2025-05-28-15-13-41"
          }]
        }],
        "volumes": [{
          "name": "restore-volume",
          "persistentVolumeClaim": {
            "claimName": "data-postgres16-postgresql-0-2025-05-28-15-13-41"
          }
        }]
      }
    }
  }
}'
```

4. Restore a specific table from the binary dump:

```
kubectl exec -it postgres16-postgresql-0 -n postgres-demo -- bash
# Inside the pod, restore only the customers table
export PGHOST='localhost'
export PGUSER='postgres'
export PGPASSWORD='your-secure-password'
pg_restore -U postgres -d testdb --table=customers --clean /2025-05-28-15-13-41/backups/testdb.dump
```

5. Verify the restore:

```
psql -d testdb -c "SELECT * FROM customers;"
```

6. Clean up by removing the temporary volume mount:
```
kubectl rollout undo statefulset/postgres16-postgresql -n postgres-demo
```

## Benefits of This Approach
This granular restore approach offers several advantages:

1. Minimal downtime - only restore what you need without affecting other databases/tables
2. Resource efficiency - no need to restore the entire database for a single table
3. Flexibility - can restore tables across environments (development/testing)
4. Data integrity - binary dumps maintain data types and constraints accurately

## Conclusion

By combining Kasten K10's volume cloning capabilities with PostgreSQL's binary dump format, we've enabled granular table-level restores that minimize downtime and maximize flexibility during recovery scenarios. This approach gives database administrators the precision tools they need for efficient recovery operations.