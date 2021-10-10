import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";

export default class Statusbar extends Component {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
  }

  resize(e) {
    this.props.resize(window.innerHeight - e.y);
  }

  render() {
    return (
      <div id="Statusbar">
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
