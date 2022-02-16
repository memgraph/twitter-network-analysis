import React from 'react';
import * as d3 from "d3";
import io from "socket.io-client"


var node;
var link;
var simulation;
var width = 900;
var height = 500;
var tooltip;

/**
 * Component that draws nodes and edges in real-time. 
 * Size of each node is proportional to the value of its rank property.
 */
export default class PageRank extends React.Component {

    constructor(props) {
        super(props);
        this.myReference = React.createRef();
        this.state = {
            nodes: [],
            links: []
        }
        this.socket = io("http://localhost:5000/", { transports: ["websocket", "polling"] })
    }


    findNode(id, updatedNodes) {
        updatedNodes.forEach((node) => {
            if (node.id === id)
                return node
        })
        return id
    }

    firstRequest() {
        fetch("http://localhost:5000/api/graph")
            .then((res) => res.json())
            .then((result) => console.log(result))
    }

    transformData(data) {
        var nodes = data.vertices.map((vertex) => {
            return {
                id: vertex.id,
                type: vertex.labels[0],
                username: vertex.username,
                rank: vertex.rank,
            };
        });
        var links = data.edges.map((edge) => {
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: edge.type,
            };
        });

        return { nodes, links };
    }

    isRankUpdated(msg) {
        let nodes = msg.data.vertices
        if(nodes.length !== 1)
            return false
        return !("cluster" in nodes["0"])
    }

    isClusterUpdated(msg) {
        let nodes = msg.data.vertices
        if(nodes.length !== 1)
            return false
        return !("rank" in nodes["0"])
    }


    componentDidMount() {
        this.initializeGraph(this.state.nodes, this.state.links)
        this.firstRequest()
        this.socket.on("connect", () => {
            this.socket.emit('consumer')
            console.log("Connected to socket ", this.socket.id)
        });

        this.socket.on("connect_error", (err) => { console.log(err) });
        this.socket.on("disconnect", () => {
            console.log("Disconnected from socket.")
        });

        this.socket.on("consumer", (msg) => {
            console.log('Received a message from the WebSocket service: ', msg.data);

            var oldNodes = this.state.nodes
            var oldLinks = this.state.links
            var updatedNodes = []

            var myData = this.transformData(msg.data)
            var newNodes = myData.nodes
            var newLinks = myData.links
            var newNode = newNodes["0"]

            // ignore cluster updates
            if(this.isClusterUpdated(msg))
                return

           
            // if rank update or simple msg
            var value = oldNodes.find((node) => node.id === newNode.id)
            if(typeof value === 'undefined'){
                updatedNodes = oldNodes.concat(newNodes)
            }
            else {
                value.rank = newNode.rank
                updatedNodes = oldNodes
            }

            // filter new edges to have only the ones that have source and target node
            var filteredLinks = newLinks.filter((link) => {
                return (
                    updatedNodes.find((node) => node.id === link.source) &&
                    updatedNodes.find((node) => node.id === link.target)
                );
            })
            // get all edges (old + new)
            var updatedLinks = oldLinks.concat(filteredLinks)

            // set source and target to appropriate node -> they exists since we filtered the edges
            updatedLinks.forEach((link) => {
                link.source = this.findNode(link.source, updatedNodes)
                link.target = this.findNode(link.target, updatedNodes)
            })

            // update state with new nodes and edges
            this.setState({ nodes: updatedNodes, links: updatedLinks })
        });

    }

    componentDidUpdate() {
        this.updateGraph(this.state.nodes, this.state.links)
    }

    componentWillUnmount() {
        this.socket.emit('disconnect');
        this.socket.disconnect();
    }

    drag() {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            tooltip.style("visibility", "hidden")
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            tooltip.style("visibility", "hidden")
            event.subject.fx = event.x;
            event.subject.fy = event.y;

        }

        function dragended(event) {
            tooltip.style("visibility", "hidden")
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    handleZoom(e) {
        d3.selectAll("svg g")
            .attr("transform", e.transform)
    }

    initZoom(zoom) {
        d3.select('svg')
            .call(zoom);
    }

    defineGradient(svg) {
        // Memgraph brand colors
        const colors = ["#FFC500", "#FB6E00", "#DD2222", "#FF0092", "#720096"]
        // Define the gradient
        const gradient = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        gradient.selectAll("stop")
            .data(colors)
            .enter()
            .append("svg:stop")
            .style("stop-color", function (d) { return d; })
            .attr("offset", function (d, i) { return 100 * (i / (colors.length - 1)) + "%"; })
            .attr("stop-opacity", function (d, i) { return 1.0; });
    }

    createTooltip() {
        return (d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden"));
    }

    /**
     * Method that initializes everything that will be drawn.
     */
    initializeGraph(nodes, links) {
        var svg = d3.select(this.myReference.current);

        // erase everything
        svg.selectAll("*").remove();

        // initialize zoom
        var zoom = d3.zoom()
            .on("zoom", this.handleZoom)
        this.initZoom(zoom)
        d3.select("svg")
            .call(zoom)

        // initialize tooltip
        tooltip = this.createTooltip()

        this.defineGradient(svg)

        // set up simulation, link and node
        simulation = d3
            .forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(function (n) { return n.id; }))
            .force(
                "x",
                d3.forceX().strength(0.05)
            )
            .force(
                "y",
                d3.forceY().strength(0.05)
            )
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        link = svg.append("g")
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.6)
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('id', (d) => d.source.id + '-' + d.target.id)
            .attr('stroke-width', 1.5);


        node = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", function (d) {
                return d.rank * 1000;
            })
            .attr("class", "node")
            .attr('fill', 'url(#gradient)')
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["rank"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 15) + "px").style("left", (event.x + 15) + "px"); })
            .on("mouseout", function (event, d) { return tooltip.style("visibility", "hidden"); })
            .call(this.drag(simulation));


        simulation.on("tick", () => {
            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);
        });
    }

    /**
     * Method that is called on every new node/edge and draws updated graph.
     */
    updateGraph(nodes, links) {

        // Remove old nodes
        node.exit().remove();

        // Add new nodes
        node = node.data(nodes, (d) => d.id);
        node = node
            .enter()
            .append('circle')
            .attr("r", function (d) {
                return d.rank * 1000;
            })
            .attr('fill', 'url(#gradient)')
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["rank"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 15) + "px").style("left", (event.x + 15) + "px"); })
            .on("mouseout", function (event, d) { return tooltip.style("visibility", "hidden"); })
            .call(this.drag())
            .merge(node);

        link = link.data(links, (d) => {
            return d.source.id + '-' + d.target.id;
        });

        // Remove old links
        link.exit().remove();

        link = link
            .enter()
            .append('line')
            .attr('id', (d) => d.source.id + '-' + d.target.id)
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 1.5)
            .merge(link);

        // Set up simulation on new nodes and edges
        try {
            simulation
                .nodes(nodes)
                .force('link', d3.forceLink(links).id(function (n) { return n.id; }))
                .force(
                    'collide',
                    d3
                        .forceCollide()
                        .radius(function (d) {
                            return d.rank * 1500;
                        })
                )
                .force('charge', d3.forceManyBody())
                .force('center', d3.forceCenter(width / 2, height / 2));
        } catch (err) {
            console.log('err', err);
        }

        simulation.on('tick', () => {
            node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);
        });
        simulation.alphaTarget(0.1).restart();
    }

    render() {
        return (<div>
            <h1>PageRank</h1>
            <p>Number of users that retweeted so far: {this.state.nodes.length}</p>
            <svg ref={this.myReference}
                style={{
                    height: 500,    //width: "100%"
                    width: 900,
                    marginRight: "0px",
                    marginLeft: "0px",
                    background: "white"
                }}></svg></div>

        );

    }

}