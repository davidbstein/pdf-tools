import React, { Component } from "react";
import { ToolList } from "@/annotation/AnnotationTypes";

export default class AnnotationBar extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div id="Annotationbar">
        {ToolList.map((tool, index) => {
          return (
            <div key={index} className="tool">
              <div
                className={`tool-icon tool-${tool.type}`}
                style={{ backgroundColor: tool.color, opacity: tool.opacity }}
              />
              <div className="tool-name">{tool.name}</div>
            </div>
          );
        })}
      </div>
    );
  }
}
