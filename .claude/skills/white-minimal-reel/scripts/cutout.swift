// Lift the foreground object out of a photo with Apple's Vision framework (macOS 14+).
// Local and free: the same subject-lifting model Photos uses. Output is an RGBA PNG cropped
// to the kept object(s).
//
// Usage: swift cutout.swift <photo.jpg|png> <out.png> [--largest | --instance N[,M]]
//   Prints every detected instance with its box so you can keep only the object you want.

import CoreImage
import Foundation
import Vision

func fail(_ message: String, _ code: Int32) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(code)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: swift cutout.swift <photo> <out.png> [--largest | --instance N[,M]]", 1) }
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
var wanted: [Int] = []
var largest = false
if let i = args.firstIndex(of: "--instance"), i + 1 < args.count {
  wanted = args[i + 1].split(separator: ",").compactMap { Int($0) }
}
if args.contains("--largest") { largest = true }

guard let image = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else {
  fail("cannot read \(input.path)", 2)
}

let handler = VNImageRequestHandler(ciImage: image)
let request = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([request])
  guard let result = request.results?.first, !result.allInstances.isEmpty else {
    fail("no foreground subject found", 3)
  }

  // Measure each labeled instance on the low-resolution label map.
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
  for label in result.allInstances.sorted() {
    if let b = boxes[label] {
      let area = Double(b.n) / Double(lw * lh) * 100
      print(String(format: "instance %d: x %.2f-%.2f  y %.2f-%.2f  area %.1f%%", label,
        Double(b.x0) / Double(lw), Double(b.x1) / Double(lw), Double(b.y0) / Double(lh), Double(b.y1) / Double(lh), area))
    }
  }

  var keep = result.allInstances
  if !wanted.isEmpty {
    keep = IndexSet(wanted.filter { result.allInstances.contains($0) })
    if keep.isEmpty { fail("none of the requested instances exist", 5) }
  } else if largest, let best = boxes.max(by: { $0.value.n < $1.value.n })?.key {
    keep = IndexSet(integer: best)
  }

  let masked = try result.generateMaskedImage(ofInstances: keep, from: handler, croppedToInstancesExtent: true)
  let lifted = CIImage(cvPixelBuffer: masked)
  let context = CIContext()
  try context.writePNGRepresentation(
    of: lifted, to: output, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  print("kept instance(s) \(keep.map { String($0) }.joined(separator: ",")) -> \(output.lastPathComponent)")
} catch {
  fail("vision failed: \(error)", 4)
}
