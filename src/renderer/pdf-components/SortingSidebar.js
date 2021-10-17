import React, { Component } from "react";
import _ from "lodash";
import "@/css/pdf/sidebar.scss";
import { ResizeGrip } from "@/components/ResizablePanel";
import { Logger } from "../helpers";

const logger = new Logger("Sidebar");

function outlineTreeToList(outlineRoot, current, level = 1) {
  if (!current) {
    const toRet = [{ ...outlineRoot, level }];
    for (let child of outlineRoot.children) {
      outlineTreeToList(child, toRet, level + 1);
    }
    return toRet;
  } else {
    current.push({ ...outlineRoot, level });
    for (let child of outlineRoot.children) {
      outlineTreeToList(child, current, level + 1);
    }
  }
}

function outlineListToTree(nodeList) {
  const root = { children: [], level: 0 };
  let currentLevel = 0;
  const path = [root];
  for (let node of nodeList) {
    if (node.level > currentLevel) {
      path.push(node);
    } else if (node.level < currentLevel) {
      for (let i = 0; i < currentLevel - node.level; i++) path.pop();
      path.push(node);
    } else {
      path.pop();
      path.push(node);
    }
    currentLevel = node.level;
    node.children = [];
    path[path.length - 1].children.push(node);
  }
  return root.children[0];
}

class OutlineNode extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    logger.log(props);
    this.goToNode = this.goToNode.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  goToNode() {
    window._pdf.goToDestinationPage(this.props.node.pageIdx);
  }

  onMouseUp(e) {
    if (e.button === 0) {
      return this.goToNode();
    }
    if (e.button === 1) {
      this.props.deleteNode(this.props.node);
    }
    if (e.button === 2) {
      this.props.toggleNodeLevel(this.props.node);
    }
  }

  render() {
    const { node, currentPath = "", level = 0 } = this.props;
    const classlist = [
      `title-name`,
      `${node.pageIdx >= this.props.pageRange[0] ? "later-than-visible-start" : ""}`,
      `${node.pageIdx <= this.props.pageRange[1] ? "earlier-than-visible-end" : ""}`,
    ].join(" ");
    return (
      <div className={`outline-node`}>
        <div className="outline-node-title-indent" />
        <div className="outline-node-title" onClick={this.goToNode}>
          <div
            className="outline-indent"
            style={{ width: `calc(--outline-indent-px * ${node.level})` }}
          />
          <div className={`${classlist}`}>{node.title}</div>
          {node.pageIdx ? <div className="outline-node-page-number">p. {node.pageIdx}</div> : []}
        </div>
        <div className="outline-subnodes"></div>
      </div>
    );
  }
}

export default class SortingSidebar extends Component {
  constructor(props) {
    super(props);
    const outlineRoots = window.HighlightManager.docProxy.listSerializableOutlines();
    this.state = {
      outlineList: outlineRoots.map(outlineTreeToList),
      pageRange: (window._pdf?._pdfViewer?.currentPageNumber || 0) - 1,
    };
    this.resize = this.resize.bind(this);
    this.handleOutlineChange = this.handleOutlineChange.bind(this);
    this.handleScroll = _.debounce(this.handleScroll.bind(this), 100, { trailing: true });
    window._pdf._eventBus.on("pagechanging", this.handleScroll);
  }

  addNode(node) {
    // TODO
  }

  deleteNode(node) {
    // TODO
  }

  toggleNodeLevel(node) {
    // TODO
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
    const sorted_nodes = _.sortBy(this.state.outlineList, "pageIdx");
    return (
      <div id="Sidebar">
        <div id="OutlineView">
          {sorted_nodes.map((node, index) => (
            <OutlineNode
              key={index}
              node={node}
              deleteNode={this.deleteNode}
              toggleNodeLevel={this.props.toggleNodeLevel}
              pageRange={this.state.pageRange}
            />
          ))}
        </div>
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
