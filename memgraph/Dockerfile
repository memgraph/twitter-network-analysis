FROM memgraph-mage

USER root

# Copy the local query modules
COPY transformations/ /transformations

COPY modules/ /usr/lib/memgraph/query_modules

USER memgraph
