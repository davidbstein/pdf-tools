import React, { Component } from "react";
import _ from "lodash";
import "@/css/pdf-sidebar.css";

/**
 * an outline is a list of nodes.
 * Each node has a title `node.title`, an array of children `node.items`, and a target `node.dest`.
 * Outline displays a tree of nodes, with expandable/collapsable nodes.
 *
 * currentPath is a list of nodes indexes, indicating the current position in the outline tree.
 * @param {object{Array{@pdfjs-dist/types/src/display/api.d.ts#OutlineNode}}} outline
 */
function Outline({ outline, currentPath = [] }) {
  return (
    <div>
      {outline
        ? outline.map((node, index) => (
            <OutlineNode key={index} node={node} currentPath={currentPath} level={0} />
          ))
        : []}
    </div>
  );
}

class OutlineNode extends Component {
  constructor(props) {
    super(props);
    const {
      currentPath,
      level,
      node: {
        dest: [destination],
      },
    } = this.props;
    const isCurrent = _.isEqual(currentPath, [level]);
    this.state = {
      expanded: level == 0 || isCurrent,
      pageIndex: null,
    };
    window._pdf.lookupDestinationPage(
      destination,
      ((pageIndex) => this.setState({ pageIndex })).bind(this)
    );
    this.goToNode = this.goToNode.bind(this);
  }

  goToNode() {
    window._pdf.goToDestinationPage(this.props.node.dest[0]);
  }

  render() {
    const { node, currentPath, level } = this.props;
    const { expanded } = this.state;
    return (
      <div className="outline-node">
        <div className="outline-node-title-indent" />
        <div className="outline-node-title" onClick={this.goToNode}>
          {node.title}
          {this.state.pageIndex ? (
            <div className="outline-node-page-number">p. {this.state.pageIndex}</div>
          ) : (
            <div />
          )}
        </div>
        <div className="outline-subnodes">
          {" "}
          {expanded &&
            node.items.map((node, index) => (
              <OutlineNode key={index} node={node} currentPath={currentPath} level={level + 1} />
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
      outline: [],
    };
    window._pdf.getOutline((outline) => {
      this.setState({ outline });
    });
  }
  render() {
    return (
      <div id="Sidebar">
        <div id="OutlineView">
          <h1>Outline</h1>
          <Outline outline={this.state.outline} />
        </div>
      </div>
    );
  }
}
