import React, { Component } from "react";
import { ToolList } from "@/annotation/AnnotationTypes";
import { ResizeGrip } from "@/components/ResizablePanel";

export default class AnnotationBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTool: ToolList[0],
      minimized: false,
    };
    this.lastSize = 0; // not in state because not used by renderer
    this.resize = this.resize.bind(this);
    this.hide = this.hide.bind(this);
    this._toolChangeListener = this._toolChangeListener.bind(this);
    addEventListener("pdf-tool-change", this._toolChangeListener);
  }

  resize(e) {
    this.props.resize(window.innerWidth - e.x);
    this.lastSize = window.innerWidth - e.x;
  }

  hide(e) {
    if (this.state.minimized) this.props.resize(this.lastSize);
    else this.props.resize(0);
    this.setState({ minimized: !this.state.minimized });
  }

  _toolChangeListener({ detail }) {
    this.setState({ currentTool: detail.tool });
  }
  render() {
    return (
      <div id="Annotationbar">
        {ToolList.map((tool, index) => {
          return (
            <div
              key={index}
              className={`tool selected-${this.state.currentTool.name == tool.name}`}
              onClick={() => window.HighlightManager.setCurrentTool(tool)}
            >
              <div className={`tool-icon tool-${tool.type}`}>
                <div
                  className={`tool-preview tool-${tool.type}-preview `}
                  style={{
                    backgroundColor: tool.colorHex,
                    opacity: 1 - (1 - (tool.opacity || 1)) ** 6,
                  }}
                />
              </div>
              <div className="tool-name">{tool.name}</div>
            </div>
          );
        })}
        <ResizeGrip resize={this.resize} hide={this.hide} />
      </div>
    );
  }
}
