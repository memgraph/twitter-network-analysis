import React from 'react';
import * as d3 from "d3";
import io from "socket.io-client"

var socket = io("http://localhost:5000/", { transports: ["polling"] })
var node;
var link;
var simulation;
var width = 900;
var height = 500;
var tooltip;
var clusters = [];
var clusterColors = {};


export default class CommunityDetection extends React.Component {

    constructor(props) {
        super(props);
        this.myReference = React.createRef();
        this.state = {
            nodes: [],
            links: [],
            isInitialized: false
        }

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
                cluster: vertex.cluster,
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
    componentDidMount() {
        this.drawGraph(this.state.nodes, this.state.links)
        this.firstRequest();

        socket.on("connect", () => {
            socket.emit('consumer')
            console.log("Connected to socket ", socket.id)
        });

        socket.on("connect_error", (err) => { console.log(err) });

        socket.on("disconnect", () => {
            console.log("Disconnected from socket.")
        });

        socket.on("consumer", (msg) => {

            console.log('Received a message from the WebSocket service: ', msg.data);

            // get old nodes
            var currentNodes = this.state.nodes
            // get new nodes
            var newNodes = this.transformData(msg.data).nodes
            // get all nodes (old + new)
            var updatedNodes = currentNodes.concat(newNodes)
            // get old edges
            var currentLinks = this.state.links
            // get new edges
            var newLinks = this.transformData(msg.data).links

            // filter new edges to have only the ones that have source and target node
            var filteredLinks = newLinks.filter((link) => {
                console.log("source = " + link.source.toString())
                console.log("target = " + link.target.toString())
                return (
                    updatedNodes.find((node) => node.id === link.source) &&
                    updatedNodes.find((node) => node.id === link.target)
                );
            })

            // get all edges (old + new)
            var updatedLinks = currentLinks.concat(filteredLinks)
            console.log("Updated edges: " + updatedLinks)

            // set source and target to appropriate node -> they exists since we filtered the edges
            updatedLinks.forEach((link) => {
                link.source = this.findNode(link.source, updatedNodes)
                link.target = this.findNode(link.target, updatedNodes)
            })


            // update state with new nodes and edges
            this.setState({ nodes: updatedNodes, links: updatedLinks })
        });

        this.setState({ isInitialized: true })

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

    createTooltip() {
        return (d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden"));
    }


    drawGraph(nodes, links) {
        // const width = parseInt(d3.select("body").select("svg").style("width"), 10)
        // const height = parseInt(d3.select("body").select("svg").style("height"), 10)

        var svg = d3.select(this.myReference.current);
        svg.selectAll("*").remove();

        var zoom = d3.zoom()
            .on("zoom", this.handleZoom)
        this.initZoom(zoom)
        d3.select("svg")
            .call(zoom)

        tooltip = this.createTooltip()

        simulation = d3
            .forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(function (n) { return n.id; }))
            .force('x', d3.forceX().strength(0.05))
            .force('y', d3.forceY().strength(0.05))
            .force("charge", d3.forceManyBody().strength(1))
            .force("center", d3.forceCenter(width / 2, height / 2));

        link = svg.append("g")
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.8)
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
            .attr('fill', function (d) {
                console.log(d.cluster)
                if (!clusterColors.hasOwnProperty(d.cluster)) {
                    clusterColors[d.cluster] = "#" + Math.floor(Math.random() * 16777215).toString(16)
                    clusters.push(d.cluster)
                }
                return clusterColors[d.cluster]
            })
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["cluster"])
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
            .attr('fill', function (d) {
                console.log(d.cluster)
                if (!clusterColors.hasOwnProperty(d.cluster)) {
                    clusterColors[d.cluster] = "#" + Math.floor(Math.random() * 16777215).toString(16)
                    clusters.push(d.cluster)
                }
                return clusterColors[d.cluster]
            })
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["cluster"] + " " + d.srcElement["__data__"]["username"])
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
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 1.5)
            .merge(link);

        try {
            simulation
                .nodes(nodes)
                .force('link', d3.forceLink(links).id(function (n) { return n.id; }))
                .force(
                    "x",
                    d3.forceX().x((d) => d.x)
                )
                .force(
                    "y",
                    d3.forceY().y((d) => d.y)
                )
                .force(
                    "collide",
                    d3.forceCollide().radius((d) => (d.rank * 1500))
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
        if (this.state.isInitialized)
            this.updateGraph(this.state.nodes, this.state.links)

        return (<div>
            <h1>Community Detection</h1>
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