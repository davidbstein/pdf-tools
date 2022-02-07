/**
 *  TODO - I want a lot of what buttons do to live in a config file, so I'm
 * trying to refactor them all into a single mouse management thing.
 */

import React, { Component } from "react";
import { ToolList } from "../annotation/AnnotationTypes";
import { emitEvent, Logger } from "../helpers";
import _ from "lodash";

const logger = new Logger("MouseFollower");

class ToolOption extends Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    this.ref;
  }
  render() {
    const props = this.props;
    return (
      <div
        className={`tool-option ${props.selected ? "tool-option-selected" : ""}`}
        onMouseEnter={() => {
          logger.log(props.toolOption);
        }}
        onMouseDown={() => {
          window.HighlightManager.setCurrentTool(props.toolOption);
          props.unshowToolOption();
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
      buttonsPressed: [0, 0, 0],
      cursorLocation: { x: 0, y: 0 },
      cursorVisible: false,
      showToolOption: false,
      tool: {},
    };
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.updateFocus = _.throttle(this.updateFocus.bind(this), 500, {
      leading: true,
      trailing: true,
    });
    this.setTool = this.setTool.bind(this);
    window.addEventListener("pdf-tool-change", this.setTool);
  }

  componentDidMount() {
    const elem = document.getElementById("Viewer");
    elem.addEventListener("mousemove", this.handleMouseMove);
    elem.addEventListener("mousedown", this.handleMouseDown);
    elem.addEventListener("mouseup", this.handleMouseUp);
    elem.addEventListener("mouseleave", this.handleMouseLeave);
    elem.addEventListener("click", this.handleClick);
    document.addEventListener("selectionchange", this.handleSelectionChange);
  }

  updateFocus(event) {
    const pageElement = _.find(event.path, (e) => e.classList && e.classList.contains("page"));
    if (pageElement) {
      const pageNumber = pageElement.dataset.pageNumber;
      const activeHighlights = _.uniq(
        Array.from(pageElement.getElementsByClassName("highlight-annotation"))
          .filter((e) => {
            const rect = e.getBoundingClientRect();
            return (
              rect.left <= event.clientX &&
              rect.right >= event.clientX &&
              rect.top <= event.clientY &&
              rect.bottom >= event.clientY
            );
          })
          .map((e) => e.dataset.annotationId)
      );
      emitEvent("app-page-focus", { pageNumber, activeHighlights }, /*suppressLog*/ true);
    }
  }

  handleClick(e) {
    // do not overload on main PDF view if in a selection mode.
    // there's default selection stuff we want to preserve.
    logger.log("click", e);
  }

  handleSelectionChange(e) {
    this.setState({ pendingSelection: true });
  }

  handleMouseMove(e) {
    if (this.state.showToolOption) return;
    this.updateFocus(e);
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
    const newState = {};
    if (e.button === 0) {
      newState.showToolOption = false;
      if (this.state.pendingSelection) {
        if (document.getSelection().rangeCount > 0)
          emitEvent("pdf-selection-made", {
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
          });
        newState.pendingSelection = false;
      }
    }
    if (e.button === 1) {
      newState.showToolOption = true;
    }
    this.setState({
      buttonsPressed: this.state.buttonsPressed.map((b, i) => (i === e.button ? false : b)),
      ...newState,
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
    if (this.state.showToolOption) {
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
              unshowToolOption={() => this.setState({ showToolOption: false })}
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
