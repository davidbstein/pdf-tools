import React, { Component } from "react";
import _ from "lodash";
import "@/css/pdf/sidebar.scss";
import { ResizeGrip } from "@/components/ResizablePanel";
import { Logger } from "../../helpers";
import { OutlineNode } from "./OutlineNode";

export const logger = new Logger("Sidebar");

export function formatOutlineItem(titleString) {
  const to_ret = unescape(titleString);
  return to_ret.replaceAll("\\", "");
}

export default class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      outlineRoots: window.HighlightManager.docProxy.listSerializableOutlines(),
    };
    this.resize = this.resize.bind(this);
    this.handleOutlineChange = this.handleOutlineChange.bind(this);
  }

  handleOutlineChange() {}

  resize(e) {
    this.props.resize(e.x);
  }

  render() {
    const { firstPageIdx, lastPageIdx, outlinePath } = this.props;
    return (
      <div id="Sidebar">
        <div id="OutlineView">
          {this.state.outlineRoots.map((outlineRoot, index) => (
            <OutlineNode
              key={index}
              node={outlineRoot}
              firstPageIdx={firstPageIdx}
              lastPageIdx={lastPageIdx}
              outlinePath={outlinePath}
            />
          ))}
        </div>
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
