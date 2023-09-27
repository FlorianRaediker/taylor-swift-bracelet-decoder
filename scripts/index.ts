import * as fs from "fs"
import FuseModule from "fuse.js"
import _TRACKS_BY_ALBUM from "./tracks.json" assert { type: "json" }
const Fuse = FuseModule as unknown as typeof FuseModule.default

function isAlpha(string: string) {
  return /^[A-z]+$/.test(string)
}

function isLowerCase(string: string) {
  return string === string.toLowerCase() && string !== string.toUpperCase()
}

function isUpperCase(string: string) {
  return string === string.toUpperCase() && string !== string.toLowerCase()
}

function getLetters(string: string): [string, number[]] | [null, null] {
  let letters = ""
  const indices = []

  string.split("").forEach((letter, i) => {
    const prev = i == 0 ? null : string[i - 1]
    if (letter === "&") {
      letters += "A"
      indices.push(i)
    } else if (letter === "0" && prev === "1") {
      // ATW*T*MV
      letters += "T"
      indices.push(i)
    } else if (
      isAlpha(letter) &&
      (prev == null ||
        (!isAlpha(prev) && prev !== "'" && prev !== "’") ||
        // e.g. Tim McGraw
        (isLowerCase(prev) && isUpperCase(letter)))
    ) {
      letters += letter
      indices.push(i)
    }
  })

  if (letters.length === 1) return [null, null]
  return [letters, indices]
}

const TRACKS = _TRACKS_BY_ALBUM
  .map(album =>
    album.tracks.map(title => {
      const [name, ...suffixes] = title.split(/([(-])/)
      console.log(name, suffixes)

      let [titleLetters, titleLettersIndices] = getLetters(name)
      if (titleLetters != null) {
        let indexOffset = name.length
        if (suffixes) {
          for (const suffix of suffixes) {
            if (suffix.includes("feat.")) {
              indexOffset += suffix.length
              continue
            }
            const [suffixLetters, suffixLettersIndices] = getLetters(suffix)
            if (suffixLetters != null) {
              titleLetters += suffixLetters
              titleLettersIndices.push(
                ...suffixLettersIndices.map(i => i + indexOffset),
              )
            }
            indexOffset += suffix.length
          }
        }
      }
      return {
        title,
        titleLetters,
        titleLettersIndices,
        albumId: album.id,
      }
    }),
  )
  .flat()

const handleError = err => {
  if (err) {
    console.error(err)
    return
  }
  console.log("File has been created")
}

fs.writeFile("../src/tracks.json", JSON.stringify(TRACKS, null, 2), handleError)

const index = Fuse.createIndex(["title", "titleLetters"], TRACKS)

fs.writeFile("../src/tracks_index.json", JSON.stringify(index), handleError)
