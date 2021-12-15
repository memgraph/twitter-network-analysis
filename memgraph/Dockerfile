FROM memgraph/memgraph-mage:1.1

USER root

# Copy the local query modules
COPY transformations/ /transformations

COPY modules/ /usr/lib/memgraph/query_modules

USER memgraph
