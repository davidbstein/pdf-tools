export function testOutlineWriter(hm) {
  console.group(`---- running outline writer integration test ----`);
  const outlines = this.docProxy.listOutlines();
  console.log("current outlines", outlines);
  outlines.map((outline) => {
    hm.docProxy.deleteOutline(outline);
  });
  hm.docProxy.createOutline([
    {
      title: "testRoot",
      page: 0,
      children: [
        {
          title: "testChild0",
          page: 1,
        },
        {
          title: "testChild1",
          page: 2,
          children: [
            {
              title: "testChild1.1",
              page: 3,
              children: [
                {
                  title: "testChild1.1.1",
                  page: [4, { type: "XYZ", args: [null, null, null] }],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
  hm.docProxy.getDocAsBytes();
  console.log("loading window.d = <PDFDocument object>");
  window.d = hm.docProxy.doc;
  console.groupEnd();
}

function testAnnotation(hm) {
  const highlights = hm.docProxy.listHighlights();
  console.groupCollapsed("highlights");
  for (let h of highlights) logger.log(h.__obj.toString());
  console.groupEnd();
}
