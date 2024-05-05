import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

function checkFileExistence(link, file) {
  let statusCode, status, errorMessage;

  try {
    let fileDir = path.dirname(file);
    let [urlWithoutSection, sectionId] = link.url.split("#");
    let filePath = path.resolve(fileDir, urlWithoutSection);
    if (fs.existsSync(filePath)) {
      statusCode = "200";
      status = "alive";
      if (sectionId) {
        let mdContent = fs.readFileSync(filePath, "utf8");
        const tree = unified().use(remarkParse).use(remarkGfm).parse(mdContent);

        let headingNodes = [];
        visit(tree, "heading", (node) => {
          let headingId;
          // Check if the first child is an HTML node
          if (node.children[0].type === "html") {
            // If it is, extract the id from it
            let match = node.children[0].value.match(/name="(.+?)"/);
            if (match) {
              headingId = match[1];
            }
          } else {
            // If it's not, generate the id from the heading text
            let headingText = node.children[0].value;
            // Check if the heading text contains a custom id
            let match = headingText.match(/{#(.+?)}/);
            if (match) {
              // If it does, use the custom id
              headingId = match[1];
            } else {
              // If it doesn't, generate the id from the heading text
              headingId = headingText
                .toLowerCase()
                .replace(/ /g, "-")
                .replace(/\./g, "");
            }
          }
          headingNodes.push(headingId);
        });

        // Check if sectionId exists in headingNodes
        if (!headingNodes.includes(sectionId)) {
          statusCode = "404";
          status = "error";
          errorMessage = `Cannot find section: ${sectionId} in file: ${link.url}.`;
        }
      }
    } else {
      statusCode = "404";
      status = "error";
      errorMessage = `Cannot find: ${link.url}.`;
    }
  } catch (err) {
    console.error(`Error in checking if file ${link.url} exist! ${err}`);
  }

  return { statusCode, status, errorMessage };
}

export { checkFileExistence };