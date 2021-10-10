import ReactDOM from "react-dom";
import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import MouseFollower from "@/components/MouseFollower";

export default class Viewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: undefined,
    };
    this.ref = React.createRef();
  }
  componentDidMount() {
    this.props.readyForPDF(ReactDOM.findDOMNode(this));
  }
  render() {
    return (
      <div id="Viewer">
        <div id="pdfViewer"></div>
        <MouseFollower />
      </div>
    );
  }
}
