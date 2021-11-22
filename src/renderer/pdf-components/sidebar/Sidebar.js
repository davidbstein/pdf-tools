import React, { Component } from "react";
import _ from "lodash";
import "@/css/pdf/sidebar.scss";
import { ResizeGrip } from "@/components/ResizablePanel";
import { Logger } from "../../helpers";
import { OutlineNode } from "./OutlineNode";

const DEFAULT_WIDTH = 150;

export const logger = new Logger("Sidebar");

export function formatOutlineItem(titleString) {
  const to_ret = unescape(titleString);
  return to_ret.replaceAll("\\", "");
}

export default class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      minimized: false,
    };
    this.lastSize = 0;
    this.resize = this.resize.bind(this);
    this.hide = this.hide.bind(this);
    this.handleOutlineChange = this.handleOutlineChange.bind(this);
  }

  handleOutlineChange() {}

  resize(e) {
    this.props.resize(e.x);
    this.lastSize = e.x;
  }

  hide(e) {
    if (this.state.minimized) this.props.resize(this.lastSize || DEFAULT_WIDTH);
    else this.props.resize(0);
    this.setState({ minimized: !this.state.minimized });
  }

  render() {
    const { firstPageIdx, lastPageIdx, outlinePath, outlineRoots } = this.props;
    return (
      <div id="Sidebar">
        <div id="OutlineView">
          {outlineRoots.map((outlineRoot, index) => (
            <OutlineNode
              key={index}
              node={outlineRoot}
              firstPageIdx={firstPageIdx}
              lastPageIdx={lastPageIdx}
              outlinePath={outlinePath}
            />
          ))}
        </div>
        <ResizeGrip resize={this.resize} hide={this.hide} />
      </div>
    );
  }
}
