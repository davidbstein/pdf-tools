import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";

function dateStr() {
  return new Date().toLocaleString();
}

export default class Statusbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      statusMessage: "",
      lastSaveTime: "",
    };
    this.resize = this.resize.bind(this);
    this.updateStatusMessage = this.updateStatusMessage.bind(this);
    this.updateLastSaveTime = this.updateLastSaveTime.bind(this);
    window.addEventListener("app-save-start", this.updateStatusMessage);
    window.addEventListener("app-save-end", this.updateLastSaveTime);
  }

  resize(e) {
    this.props.resize(window.innerHeight - e.y);
  }

  updateStatusMessage(event) {
    this.setState({
      statusMessage: `[${event.detail.message}] started ${dateStr()}`,
    });
  }

  updateLastSaveTime(event) {
    const toSet = {
      statusMessage: `[${event.detail.message}] complete ${dateStr()}`,
    };
    if (event.detail.message == "save") toSet.lastSaveTime = `last save: ${dateStr()}`;
    this.setState(toSet);
  }

  render() {
    return (
      <div id="Statusbar">
        <div id="Statusbar-left"> </div>
        <div id="Statusbar-mid"></div>
        <div id="Statusbar-right">
          <div className="status-message">{this.state.statusMessage}</div>
          <div> –– </div>
          <div className="last-save">{this.state.lastSaveTime}</div>
        </div>
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
