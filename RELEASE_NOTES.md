## 🌍 Accents optional

Your colleague's note is `Łukasz Nowak.md`, but your keyboard isn't Polish. Now you type `Lukasz Nowak ` and get `[[Łukasz Nowak]]` — spelled the way the note is, not the way you typed it.

- **Every Latin-script language, both directions.** `Gokhan Sahin` → `Gökhan Şahin`, `Dvorak` → `Dvořák`, `Nguyen` → `Nguyễn`, `Strasse` → `Straße`. Typing the accented spelling to find a plain one works just as well.
- **No letter lists to maintain.** It's a language setting, not a table of characters. The default, *All languages*, needs no setup at all — `ł` only ever means `l`, so there's nothing to configure. Prefer control? Switch to *Only selected languages* and tick the ones you want, from Polish to Vietnamese.
- **Alternative spellings too.** `Soeren` and `Soren` both find `Søren`; `Mueller` finds `Müller`. Where languages genuinely disagree about a letter, both readings are accepted.
- **Your `//` aliases and `;;` search follow along.** `trip//Lukasz` resolves to `[[Łukasz Nowak|trip]]`, and the search popup finds accented notes from plain typing.
- **Look-alike names stay separate.** If your vault holds both `Zürich.md` and `Zurich.md`, Linkosaurus spots the clash and matches that one name exactly, so neither ever links to the other.

On by default. Turn it off in settings and matching goes back to exact spelling.

### Also fixed

The Turkish dotted capital `İ` used to shift the match position by one character, because lowercasing it produces two characters instead of one. Positions are now mapped explicitly, which fixes that and every other letter whose lowercase or folded form has a different length — `ß`, `æ`, `þ`.

Happy linking. 🦕
