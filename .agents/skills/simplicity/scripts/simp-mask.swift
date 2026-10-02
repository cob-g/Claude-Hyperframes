// Subject masks for the simplicity kit, with Apple's Vision framework (macOS 14+): the same
// "lift subject" model Photos uses, run locally. Unlike a sticker cutout, every output keeps the
// full frame size, so a cutout sits exactly where its subject stands in the shot.
//
// Usage: simp-mask <frame.png|jpg> <out-dir>
//   Writes <out-dir>/all.png (every instance), <out-dir>/inst-<n>.png (one per instance), all RGBA
//   and uncropped, and prints JSON: { "w", "h", "instances": [ { "id", "box": [x0,y0,x1,y1], "area" } ] }
//   Boxes are fractions of the frame (top-left origin); instances are sorted by area, largest first.
//
// The builder compiles this once (swiftc -O) into the project's simp/cache/bin/.

import CoreImage
import Foundation
import Vision

func fail(_ message: String, _ code: Int32) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(code)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: simp-mask <frame> <out-dir>", 1) }
let input = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

guard let image = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else {
  fail("cannot read \(input.path)", 2)
}
let W = Int(image.extent.width), H = Int(image.extent.height)
let handler = VNImageRequestHandler(ciImage: image)
let request = VNGenerateForegroundInstanceMaskRequest()
let context = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!

func write(_ instances: IndexSet, _ result: VNInstanceMaskObservation, _ name: String) throws {
  let masked = try result.generateMaskedImage(ofInstances: instances, from: handler, croppedToInstancesExtent: false)
  try context.writePNGRepresentation(of: CIImage(cvPixelBuffer: masked), to: outDir.appendingPathComponent(name), format: .RGBA8, colorSpace: srgb)
}

do {
  try handler.perform([request])
  guard let result = request.results?.first, !result.allInstances.isEmpty else {
    print("{\"w\":\(W),\"h\":\(H),\"instances\":[]}")
    exit(0)
  }
  // Measure each labelled instance on the low-resolution label map.
  let labels = result.instanceMask
  CVPixelBufferLockBaseAddress(labels, .readOnly)
  let lw = CVPixelBufferGetWidth(labels), lh = CVPixelBufferGetHeight(labels)
  let stride = CVPixelBufferGetBytesPerRow(labels)
  let base = CVPixelBufferGetBaseAddress(labels)!.assumingMemoryBound(to: UInt8.self)
  var boxes: [Int: (x0: Int, y0: Int, x1: Int, y1: Int, n: Int)] = [:]
  for y in 0..<lh {
    for x in 0..<lw {
      let label = Int(base[y * stride + x])
      if label == 0 { continue }
      let b = boxes[label] ?? (x, y, x, y, 0)
      boxes[label] = (min(b.x0, x), min(b.y0, y), max(b.x1, x), max(b.y1, y), b.n + 1)
    }
  }
  CVPixelBufferUnlockBaseAddress(labels, .readOnly)

  try write(result.allInstances, result, "all.png")
  var rows: [String] = []
  let ordered = result.allInstances.sorted { (boxes[$0]?.n ?? 0) > (boxes[$1]?.n ?? 0) }
  for label in ordered {
    guard let b = boxes[label] else { continue }
    try write(IndexSet(integer: label), result, "inst-\(label).png")
    let f = { (v: Int, d: Int) in String(format: "%.4f", Double(v) / Double(d)) }
    rows.append("{\"id\":\(label),\"box\":[\(f(b.x0, lw)),\(f(b.y0, lh)),\(f(b.x1 + 1, lw)),\(f(b.y1 + 1, lh))],\"area\":\(String(format: "%.4f", Double(b.n) / Double(lw * lh)))}")
  }
  print("{\"w\":\(W),\"h\":\(H),\"instances\":[\(rows.joined(separator: ","))]}")
} catch {
  fail("vision failed: \(error)", 4)
}
