import React, { Component } from "react";
import { ToolList } from "../annotation/AnnotationTypes";

function ToolOption(props) {
  return (
    <div
      className={`tool-option ${props.selected ? "tool-option-selected" : ""}`}
      onMouseEnter={() => {
        console.log(props.toolOption);
        window.HighlightManager.setCurrentTool(props.toolOption);
      }}
    >
      <div
        className="tool-option-icon"
        style={{
          backgroundColor: props.toolOption.colorHex,
        }}
      >
        <div className="tool-option-popup">{props.toolOption.name}</div>
      </div>
    </div>
  );
}

/**
 * a little box that follows the mouse, offset slightly to down and right
 * when the middle button is clicked, opens a menu, and mouse movement selects items in the menu
 * @param {*} props
 */
export default class MouseFollower extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cursorLocation: { x: 0, y: 0 },
      cursorVisible: false,
      buttonsPressed: [0, 0, 0],
      tool: {},
    };
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.setTool = this.setTool.bind(this);
    window.addEventListener("pdf-tool-change", this.setTool);
  }

  componentDidMount() {
    const elem = document.getElementById("Viewer");
    elem.onmousemove = this.handleMouseMove;
    elem.addEventListener("mousedown", this.handleMouseDown);
    elem.addEventListener("mouseup", this.handleMouseUp);
    elem.addEventListener("mouseleave", this.handleMouseLeave);
  }

  handleMouseMove(e) {
    if (this.state.buttonsPressed[1]) {
      return;
    }
    this.setState({
      cursorLocation: { x: e.clientX, y: e.clientY },
      cursorVisible: true,
    });
  }

  handleMouseDown(e) {
    this.setState({
      buttonsPressed: this.state.buttonsPressed.map((b, i) => (i === e.button ? true : b)),
    });
  }

  handleMouseUp(e) {
    this.setState({
      buttonsPressed: this.state.buttonsPressed.map((b, i) => (i === e.button ? false : b)),
    });
  }

  handleMouseLeave() {
    this.setState({
      buttonsPressed: [0, 0, 0],
      cursorVisible: false,
    });
  }

  setTool({ detail }) {
    this.setState({
      tool: detail.tool,
    });
  }

  render() {
    const { cursorLocation, cursorVisible, buttonsPressed, tool } = this.state;
    if (!cursorVisible) return <div />;
    if (buttonsPressed[1]) {
      return (
        <div
          className="mouse-follower-popup"
          style={{
            left: cursorLocation.x,
            top: cursorLocation.y,
          }}
        >
          {ToolList.map((toolOption) => (
            <ToolOption
              key={toolOption.name}
              toolOption={toolOption}
              selected={toolOption?.name == tool.name}
            />
          ))}
        </div>
      );
    }
    return (
      <div
        style={{
          position: "fixed",
          left: cursorLocation.x + 10,
          top: cursorLocation.y + 10,
          width: 5,
          height: 5,
          border: "1px solid black",
          backgroundColor: tool.colorHex,
          zIndex: 100,
        }}
      />
    );
  }
}
