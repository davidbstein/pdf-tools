import React, { Component } from "react";
import _ from "lodash";
import "@/css/pdf/sidebar.scss";
import { ResizeGrip } from "@/components/ResizablePanel";
import { Logger } from "../helpers";

const logger = new Logger("Sidebar");

class OutlineNode extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dragOver: false,
      dragX: 0,
      dragY: 0,
    };
    logger.log(props);
    this.goToNode = this.goToNode.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragEnter = this.onDragEnter.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragExit = this.onDragExit.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  goToNode() {
    window._pdf.goToDestinationPage(this.props.node.pageIdx);
  }

  onMouseUp(e) {
    if (e.button === 0) {
      return this.goToNode();
    }
    if (e.button === 2) {
      //RIGHT CLICK
    }
  }

  onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    logger.log(e.dataTransfer.getData("text/json"));
    logger.log("onDrop", this.props.node.title, e);
    this.setState({ dragOver: false, dragX: 0, dragY: 0 });
  }

  onDragStart(e) {
    logger.log(`onDragStart`, e);
    e.dataTransfer.setData("text/json", JSON.stringify(this.props.node));
  }

  onDragOver(e) {
    e.preventDefault();
    this.setState({
      dragOver: true,
      dragX: e.clientX,
      dragY: e.clientY,
    });
  }

  onDragEnter(e) {
    e.preventDefault();
    this.setState({ dragOver: true, dragX: e.clientX, dragY: e.clientY });
  }

  onDragExit(e) {
    e.preventDefault();
    this.setState({ dragOver: false, dragX: e.clientX, dragY: e.clientY });
  }

  onDragEnd(e) {
    e.preventDefault();
    this.setState({ dragOver: false, dragX: 0, dragY: 0 });
  }

  render() {
    const { node, currentPath = "", level = 0 } = this.props;
    return (
      <div className={`outline-node`}>
        <div className="outline-node-title-indent" />
        <div className="outline-node-title" onClick={this.goToNode}>
          <div
            className={`title-name ${this.state.dragOver ? "dragOver" : ""} ${
              node.pageIdx >= this.props.pageRange[0] ? "later-than-visible-start" : ""
            } ${node.pageIdx <= this.props.pageRange[1] ? "earlier-than-visible-end" : ""}`}
            draggable="true"
            onDragOver={this.onDragOver}
            onDragStart={this.onDragStart}
            onDragEnd={this.onDragEnd}
            onDragEnter={this.onDragEnter}
            onDragExit={this.onDragExit}
            onDragLeave={this.onDragExit}
            onDrop={this.onDrop}
          >
            {node.title}
          </div>
          {node.pageIdx ? (
            <div className="outline-node-page-number">p. {node.pageIdx}</div>
          ) : (
            <div />
          )}
        </div>
        <div className="outline-subnodes">
          {node.children.map((node, index) => (
            <OutlineNode
              key={index}
              node={node}
              currentPath={currentPath}
              level={level + 1}
              pageRange={this.props.pageRange}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      outlineRoots: window.HighlightManager.docProxy.listSerializableOutlines(),
      pageRange: (window._pdf?._pdfViewer?.currentPageNumber || 0) - 1,
    };
    this.resize = this.resize.bind(this);
    this.handleOutlineChange = this.handleOutlineChange.bind(this);
    this.handleScroll = _.debounce(this.handleScroll.bind(this), 100, {
      leading: true,
      trailing: true,
    });
    window._pdf._eventBus.on("pagechanging", this.handleScroll);
  }

  handleScroll() {
    const visisblePages = window._pdf._pdfViewer._getVisiblePages();
    const pageRange = [visisblePages.first.id, visisblePages.last.id];
    logger.log("handleScroll", pageRange);
    this.setState({ pageRange });
  }

  handleOutlineChange() {}

  resize(e) {
    this.props.resize(e.x);
  }

  render() {
    return (
      <div id="Sidebar">
        <div id="OutlineView">
          {this.state.outlineRoots.map((outlineRoot, index) => (
            <OutlineNode key={index} node={outlineRoot} pageRange={this.state.pageRange} />
          ))}
        </div>
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
