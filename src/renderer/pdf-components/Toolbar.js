import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";

export default class Toolbar extends Component {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
  }
  resize(e) {
    this.props.resize(e.y);
  }
  render() {
    return (
      <div id="Toolbar">
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
