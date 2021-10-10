import React, { Component } from "react";
import { ToolList } from "@/annotation/AnnotationTypes";
import { ResizeGrip } from "@/components/ResizablePanel";

export default class AnnotationBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTool: ToolList[0],
    };
    this.resize = this.resize.bind(this);
    this.toolChange = this.toolChange.bind(this);
  }
  resize(e) {
    this.props.resize(window.innerWidth - e.x);
  }
  toolChange(tool) {
    window.HighlightManager.setCurrentTool(tool);
    this.setState({ currentTool: tool });
  }
  render() {
    return (
      <div id="Annotationbar">
        {ToolList.map((tool, index) => {
          return (
            <div
              key={index}
              className={`tool selected-${this.state.currentTool.name == tool.name}`}
              onClick={() => this.toolChange(tool)}
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
        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
