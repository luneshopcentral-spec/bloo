// Tiny MP4 encoder using macOS's built-in AVFoundation (H.264 + AAC). No ffmpeg needed.
//
//   swiftc -O encode.swift -o encode
//   ./encode video <framesDir> <fps> <video-only.mp4>
//   ./encode mux   <video.mp4> <audio.wav> <final.mp4>
//   ./encode probe <file.mp4>
//   ./encode thumb <file.mp4> <seconds> <out.png>
import Foundation
import AVFoundation
import CoreGraphics
import CoreVideo
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

func loadImage(_ path: String) -> CGImage? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

func encodeVideo(dir: String, fps: Int32, out: String) {
    let files = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? [])
        .filter { $0.hasPrefix("f_") && $0.hasSuffix(".png") }.sorted()
    guard !files.isEmpty, let first = loadImage(dir + "/" + files[0]) else { fail("No frames (f_*.png) found in \(dir)") }
    let w = first.width, h = first.height
    try? FileManager.default.removeItem(atPath: out)

    guard let writer = try? AVAssetWriter(outputURL: URL(fileURLWithPath: out), fileType: .mp4) else { fail("Cannot create writer") }
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: w,
        AVVideoHeightKey: h,
        AVVideoColorPropertiesKey: [
            AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
            AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
            AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
        ],
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 12_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
            AVVideoExpectedSourceFrameRateKey: Int(fps),
            AVVideoAllowFrameReorderingKey: false,
        ],
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: w,
            kCVPixelBufferHeightKey as String: h,
        ])
    writer.add(input)
    guard writer.startWriting() else { fail("startWriting failed: \(String(describing: writer.error))") }
    writer.startSession(atSourceTime: .zero)

    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    for (i, name) in files.enumerated() {
        guard let img = loadImage(dir + "/" + name) else { fail("Cannot read frame \(name)") }
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
        guard let pool = adaptor.pixelBufferPool else { fail("No pixel buffer pool") }
        var pbOpt: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pbOpt)
        guard let pb = pbOpt else { fail("Cannot allocate pixel buffer") }
        CVPixelBufferLockBaseAddress(pb, [])
        guard let ctx = CGContext(
            data: CVPixelBufferGetBaseAddress(pb), width: w, height: h, bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
        else { fail("Cannot create bitmap context") }
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
        CVPixelBufferUnlockBaseAddress(pb, [])
        if !adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps)) {
            fail("Append failed at frame \(i): \(String(describing: writer.error))")
        }
        if i % 150 == 0 { print("  encoded \(i)/\(files.count)") }
    }
    input.markAsFinished()
    let sem = DispatchSemaphore(value: 0)
    writer.finishWriting { sem.signal() }
    sem.wait()
    if writer.status != .completed { fail("Video encode failed: \(String(describing: writer.error))") }
    print("Wrote \(out)  (\(files.count) frames @ \(fps)fps, \(w)x\(h))")
}

func export(_ session: AVAssetExportSession, to url: URL, type: AVFileType) {
    session.outputURL = url
    session.outputFileType = type
    let sem = DispatchSemaphore(value: 0)
    session.exportAsynchronously { sem.signal() }
    sem.wait()
    if session.status != .completed { fail("Export failed: \(String(describing: session.error))") }
}

func mux(video: String, audio: String, out: String) {
    let tmpAudio = out + ".tmp.m4a"
    try? FileManager.default.removeItem(atPath: tmpAudio)
    try? FileManager.default.removeItem(atPath: out)

    // 1) WAV -> AAC (.m4a)
    let wav = AVURLAsset(url: URL(fileURLWithPath: audio))
    guard let aExp = AVAssetExportSession(asset: wav, presetName: AVAssetExportPresetAppleM4A) else { fail("Cannot make audio export session") }
    export(aExp, to: URL(fileURLWithPath: tmpAudio), type: .m4a)

    // 2) video + AAC audio -> MP4, no re-encode of the video
    let vAsset = AVURLAsset(url: URL(fileURLWithPath: video))
    let aAsset = AVURLAsset(url: URL(fileURLWithPath: tmpAudio))
    guard let vTrack = vAsset.tracks(withMediaType: .video).first, let aTrack = aAsset.tracks(withMediaType: .audio).first else { fail("Missing track") }
    let comp = AVMutableComposition()
    guard let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
          let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
    else { fail("Cannot make composition tracks") }
    let duration = vAsset.duration
    do {
        try cv.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: vTrack, at: .zero)
        let audioDur = CMTimeMinimum(duration, aAsset.duration)
        try ca.insertTimeRange(CMTimeRange(start: .zero, duration: audioDur), of: aTrack, at: .zero)
    } catch { fail("Insert failed: \(error)") }
    guard let exp = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { fail("Cannot make passthrough session") }
    exp.shouldOptimizeForNetworkUse = true
    export(exp, to: URL(fileURLWithPath: out), type: .mp4)
    try? FileManager.default.removeItem(atPath: tmpAudio)
    print("Wrote \(out)")
}

func fourCC(_ code: FourCharCode) -> String {
    let bytes = [UInt8((code >> 24) & 255), UInt8((code >> 16) & 255), UInt8((code >> 8) & 255), UInt8(code & 255)]
    return String(bytes: bytes, encoding: .ascii) ?? "????"
}

func probe(_ path: String) {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    let size = ((try? FileManager.default.attributesOfItem(atPath: path)[.size]) as? NSNumber)?.intValue ?? 0
    print(String(format: "file: %@  (%.2f MB)", path, Double(size) / 1_048_576))
    print(String(format: "duration: %.3f s", CMTimeGetSeconds(asset.duration)))
    for t in asset.tracks {
        let codec = (t.formatDescriptions as? [CMFormatDescription])?.first.map { fourCC(CMFormatDescriptionGetMediaSubType($0)) } ?? "?"
        if t.mediaType == .video {
            print(String(format: "video: %@  %dx%d  %.2f fps  %.1f Mbps", codec, Int(t.naturalSize.width), Int(t.naturalSize.height), t.nominalFrameRate, Double(t.estimatedDataRate) / 1_000_000))
        } else if t.mediaType == .audio {
            print(String(format: "audio: %@  %.1f kbps  track %.3f s", codec, Double(t.estimatedDataRate) / 1000, CMTimeGetSeconds(t.timeRange.duration)))
        }
    }
}

func thumb(_ path: String, seconds: Double, out: String) {
    let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: path)))
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
    gen.appliesPreferredTrackTransform = true
    do {
        let img = try gen.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
        guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("No PNG destination") }
        CGImageDestinationAddImage(dest, img, nil)
        if !CGImageDestinationFinalize(dest) { fail("PNG write failed") }
    } catch { fail("Thumbnail failed: \(error)") }
}

let a = CommandLine.arguments
guard a.count >= 3 else { fail("usage: encode video|mux|probe|thumb ...") }
switch a[1] {
case "video": guard a.count == 5, let fps = Int32(a[3]) else { fail("usage: encode video <framesDir> <fps> <out.mp4>") }; encodeVideo(dir: a[2], fps: fps, out: a[4])
case "mux": guard a.count == 5 else { fail("usage: encode mux <video.mp4> <audio.wav> <out.mp4>") }; mux(video: a[2], audio: a[3], out: a[4])
case "probe": probe(a[2])
case "thumb": guard a.count == 5, let s = Double(a[3]) else { fail("usage: encode thumb <file.mp4> <seconds> <out.png>") }; thumb(a[2], seconds: s, out: a[4])
default: fail("unknown command \(a[1])")
}
