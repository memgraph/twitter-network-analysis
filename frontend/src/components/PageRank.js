import React from 'react';
import * as d3 from "d3";


var node;
var link;
var forceCollide;
var forceLink;
var simulation;
var width = 1000;
var height = 700;
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
        this.socket = this.props.socket
    }

    async firstRequest() {
        let response = await fetch("http://localhost:5000/health")
        
        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        else 
            console.log(response)
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

    isClusterUpdated(msg) {
        let nodes = msg.data.vertices
        if(nodes.length !== 1)
            return false
        return !("rank" in nodes["0"])
    }


    componentDidMount() {
        this.initializeGraph()
        this.firstRequest()

        this.socket.on("connect", () => {
            //this.socket.emit('consumer')
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

            var updatedLinks = oldLinks.concat(filteredLinks)

            this.setState({ nodes: updatedNodes, links: updatedLinks })
        });

    }

    componentDidUpdate() {
        this.updateGraph()
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
        d3.selectAll(".PageRankSvg g")
            .attr("transform", e.transform)
    }

    initZoom(zoom) {
        d3.select('.PageRankSvg')
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
        return (d3.select(".PageRankDiv")
            .append("div")
            .attr("class", "tooltip-cd")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden"));
    }

    /**
     * Method that initializes everything that will be drawn.
     */
    initializeGraph() {
        var svg = d3.select(this.myReference.current);

        svg.selectAll("*").remove();

        var zoom = d3.zoom()
            .on("zoom", this.handleZoom)
        this.initZoom(zoom)
        d3.select(".PageRankSvg")
            .call(zoom)

        tooltip = this.createTooltip()

        this.defineGradient(svg)

        forceCollide = d3.forceCollide().strength(1).radius(function (d) {
            return d.rank * 1500;
        })

        forceLink = d3.forceLink(this.state.links).id(function (n) { return n.id; })

        simulation = d3
            .forceSimulation(this.state.nodes)
            .force('link', forceLink)
            .force('collide', forceCollide)
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force(
                "x",
                d3.forceX().strength(0.05)
            )
            .force(
                "y",
                d3.forceY().strength(0.05)
            );

        simulation.on("tick", () => {
            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);
        });

        link = svg.append("g")
            .attr("class", "links")
            .selectAll('line')
            .data(this.state.links)
            .join('line')
            .attr('stroke', 'black')
            .attr('id', (d) => d.source.id + '-' + d.target.id)
            .attr('stroke-width', 1.2);

        node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(this.state.nodes)
            .join("circle")
            .attr("r", function (d) {
                return d.rank * 700;
            })
            .attr('fill', 'url(#gradient)')
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["username"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 15) + "px").style("left", (event.x + 15) + "px"); })
            .on("mouseout", function (event, d) { return tooltip.style("visibility", "hidden"); })
            .call(this.drag(simulation));

    }

    /**
     * Method that is called on every new incoming msg and draws updated graph.
     */
    updateGraph() {

        // Remove anything that was removed from nodes array
        node.exit().remove();

        // Give attributes to all nodes that enter -> new ones + merge - update the existing DOM elements
        node = node.data(this.state.nodes, (d) => d.id);
        node = node
            .enter()
            .append('circle')
            .merge(node) //returns a brand new selection that contains both enter and update selection
            .attr("r", function (d) {
                return d.rank * 700;
            })
            .attr('fill', 'url(#gradient)')
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["username"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 15) + "px").style("left", (event.x + 15) + "px"); })
            .on("mouseout", function (event, d) { return tooltip.style("visibility", "hidden"); })
            .call(this.drag());


        link.exit().remove();
        link = link.data(this.state.links, (d) => {
            return d.source.id + '-' + d.target.id;
        });
        link = link
            .enter()
            .append('line')
            .merge(link)
            .attr('id', (d) => d.source.id + '-' + d.target.id)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.2);

        // Update simulation
        try {
            simulation
                .nodes(this.state.nodes)
                .force('collide', forceCollide)
            forceLink.links(this.state.links)
        } catch (err) {
            console.log('err', err);
        }

        simulation.alphaTarget(0.1).restart();
    }

    render() {
        return (<div className="PageRankDiv">
            <h2>Number of users that retweeted so far: {this.state.nodes.length}</h2>
            <h1>PageRank</h1>
            <svg className="PageRankSvg" ref={this.myReference}
                style={{
                    height: 700,    //width: "100%"
                    width: 1000,
                    marginRight: "0px",
                    marginLeft: "0px",
                    background: "white"
                }}></svg></div>
        );

    }

}