import React from 'react';
import * as d3 from "d3";

var node;
var link;
var simulation;
var forceLink;
var width = 1000;
var height = 700;
var tooltip;
var clusterColors = {};

/**
 * Component that draws nodes and edges as a part of different communities in real-time.
 */
export default class CommunityDetection extends React.Component {

    constructor(props) {
        super(props);
        this.myReference = React.createRef();
        this.state = {
            nodes: [],
            links: []
        }
        this.socket = this.props.socket
    }


    firstRequest() {
        fetch("http://localhost:5000/health")
            .then((res) => res.json())
            .then((result) => console.log(result))
    }

    transformData(data) {
        var nodes = data.vertices.map((vertex) => {
            return {
                id: vertex.id,
                type: vertex.labels[0],
                username: vertex.username,
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

    isRankUpdated(msg) {
        let nodes = msg.data.vertices
        if(nodes.length !== 1)
            return false
        return !("cluster" in nodes["0"])
    }

    componentDidMount() {
        this.initializeGraph()
        this.firstRequest();

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

            // ignore rank updates
            if(this.isRankUpdated(msg)){
                return
            }
                
            // if cluster update or simple msg
            var value = oldNodes.find((node) => node.id === newNode.id)
            if(typeof value === 'undefined'){
                updatedNodes = oldNodes.concat(newNodes)
            }
            else {
                value.cluster = newNode.cluster
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
        d3.selectAll(".CommunityDetectionSvg g")
            .attr("transform", e.transform)
    }

    initZoom(zoom) {
        d3.select('.CommunityDetectionSvg')
            .call(zoom);
    }

    createTooltip() {
        return (d3.select(".CommunityDetectionDiv")
            .append("div")
            .attr("class", "tooltip-cd")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden"));
    }

    /**
     * Method that initializes everything that will be drawn.
     */
    initializeGraph(nodes, links) {
        var svg = d3.select(this.myReference.current);
        svg.selectAll("*").remove();

        var zoom = d3.zoom()
            .on("zoom", this.handleZoom)
        this.initZoom(zoom)
        d3.select(".CommunityDetectionSvg")
            .call(zoom)

        tooltip = this.createTooltip()
        forceLink = d3.forceLink(this.state.links).id(function (n) { return n.id; })

        // set up simulation, link and node
        simulation = d3
            .forceSimulation(nodes)
            .force('link', forceLink)
            .force(
                'collide',
                d3
                    .forceCollide()
                    .radius(function (d) {
                        return 20;
                    })
            )
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
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.8)
            .selectAll('line')
            .data(this.state.links)
            .join('line')
            .attr('id', (d) => d.source.id + '-' + d.target.id)
            .attr('stroke-width', 1.5);


        node = svg.append("g")
            .selectAll("circle")
            .data(this.state.nodes)
            .join("circle")
            .attr("r", function (d) {
                return 7;
            })
            .attr("class", "node")
            .attr('fill', function (d) {
                let cluster = d.cluster
                let key = cluster.toString()
                if (!(key in clusterColors)) {
                    clusterColors[key] = "#" + Math.floor(Math.random() * 16777215).toString(16)
                }
                return clusterColors[key]
            })
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["username"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 10) + "px").style("left", (event.x + 10) + "px"); })
            .on("mouseout", function (event, d) { return tooltip.style("visibility", "hidden"); })
            .call(this.drag(simulation));


    }

    /**
     * Method that is called on every new node/edge and draws updated graph.
     */
    updateGraph() {

        // Remove old nodes
        node.exit().remove();

         // Give attributes to all nodes that enter -> new ones + merge - update the existing DOM elements
        node = node.data(this.state.nodes, (d) => d.id);
        node = node
            .enter()
            .append('circle')
            .merge(node)
            .attr("r", function (d) {
                return 7;
            })
            .attr('fill', function (d) {
                let cluster = d.cluster
                let key = cluster.toString()
                if (!(key in clusterColors)) {
                    clusterColors[key] = "#" + Math.floor(Math.random() * 16777215).toString(16)
                }
                return clusterColors[key]
            })
            .on("mouseover", function (d) {
                tooltip.text(d.srcElement["__data__"]["username"])
                tooltip.style("visibility", "visible")
            })
            .on("mousemove", function (event, d) { return tooltip.style("top", (event.y - 10) + "px").style("left", (event.x + 10) + "px"); })
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
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 1.5);

        // Set up simulation on new nodes and edges
        try {
            simulation
                .nodes(this.state.nodes)
            forceLink.links(this.state.links)
        } catch (err) {
            console.log('err', err);
        }

        simulation.alphaTarget(0.1).restart();
    }

    render() {
        return (<div className="CommunityDetectionDiv">
            <h1>Community Detection</h1>
            <svg className="CommunityDetectionSvg" ref={this.myReference}
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