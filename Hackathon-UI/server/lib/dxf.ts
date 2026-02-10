// Simple DXF Writer for Construction Planner
// Generates a minimal DXF R12 file

export class DxfWriter {
  private content: string[] = [];

  constructor() {
    this.header();
  }

  private header() {
    this.content.push("0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "0", "ENDSEC");
    this.content.push("0", "SECTION", "2", "ENTITIES");
  }

  public addLine(x1: number, y1: number, x2: number, y2: number, layer: string = "WALL") {
    this.content.push(
      "0", "LINE",
      "8", layer,
      "10", x1.toString(), "20", y1.toString(), "30", "0.0",
      "11", x2.toString(), "21", y2.toString(), "31", "0.0"
    );
  }

  public addText(x: number, y: number, text: string, height: number = 10, layer: string = "TEXT") {
    this.content.push(
      "0", "TEXT",
      "8", layer,
      "10", x.toString(), "20", y.toString(), "30", "0.0",
      "40", height.toString(),
      "1", text
    );
  }

  public addRect(x: number, y: number, w: number, h: number, layer: string = "WALL") {
    this.addLine(x, y, x + w, y, layer);
    this.addLine(x + w, y, x + w, y + h, layer);
    this.addLine(x + w, y + h, x, y + h, layer);
    this.addLine(x, y + h, x, y, layer);
  }

  public end() {
    this.content.push("0", "ENDSEC", "0", "EOF");
    return this.content.join("\n");
  }
}
