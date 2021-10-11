import ReactDOM from "react-dom";
import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import MouseFollower from "@/pdf-components/MouseFollower";

class LoadingBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dots: 1,
    };
  }
  render() {
    return (
      <div id="mainloadingdiv">
        <div>loading...</div>
      </div>
    );
  }
}

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
        <div id="pdfViewer">
          <LoadingBar />
        </div>
        <MouseFollower />
      </div>
    );
  }
}
