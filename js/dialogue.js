/* Ashland Elementary 26/27 - FF6-style dialogue windows */
var G = window.G = window.G || {};

(function () {
  var SW = 320, SH = 240;
  var active = false;
  var pages = [];      // [{name, text, icon}]
  var pageIdx = 0;
  var charCount = 0;
  var wrapped = [];
  var choices = null;  // [{label, cb}]
  var choiceRects = []; // where each option was last drawn, for finger taps
  var choiceIdx = 0;
  var inChoices = false;
  var onDone = null;
  var blipTick = 0;

  function font(px) { return px + 'px "Press Start 2P", monospace'; }

  function drawWindow(ctx, x, y, w, h) {
    // FF6-style gradient window in Ashland's dark green
    var grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#2e8a52');
    grad.addColorStop(1, '#0c2e1b');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = '#e8e8f4';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  }

  function wrapText(ctx, text, maxW) {
    ctx.font = font(8);
    var words = text.split(' ');
    var lines = [];
    var line = '';
    words.forEach(function (w) {
      var trial = line ? line + ' ' + w : w;
      if (ctx.measureText(trial).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = trial;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function preparePage(ctx) {
    var p = pages[pageIdx];
    var maxW = p.icon ? 250 : 284;
    wrapped = wrapText(ctx, p.text, maxW);
    // split anything too tall for the window into a follow-up page
    var maxLines = p.name ? 3 : 4;
    if (wrapped.length > maxLines) {
      var rest = wrapped.slice(maxLines).join(' ');
      wrapped = wrapped.slice(0, maxLines);
      pages.splice(pageIdx + 1, 0, { name: p.name, text: rest, icon: p.icon });
    }
    charCount = 0;
    if (p.fanfare && p.letter) {
      G.Quest.collect(p.letter);
      p.fanfare = false;
    }
    if (p.pa) {
      G.Audio.sfx('chime'); // the intercom bings before it speaks
      p.pa = false;
    }
  }

  function totalChars() {
    return wrapped.join(' ').length;
  }

  function start(pgs, opts) {
    // every page passes through the language layer on its way in; strings
    // with no dictionary entry (like the SOAR expectations) stay English
    pages = pgs.map(function (p) {
      var q = {};
      for (var k in p) q[k] = p[k];
      q.text = G.Lang.t(p.text);
      if (p.name) q.name = G.Lang.t(p.name);
      return q;
    });
    pageIdx = 0;
    charCount = 0;
    choices = (opts && opts.choices) || null;
    if (choices) {
      choices = choices.map(function (c) {
        return { label: G.Lang.t(c.label), cb: c.cb };
      });
    }
    onDone = (opts && opts.onDone) || null;
    choiceIdx = 0;
    inChoices = false;
    active = true;
    wrapped = null;
  }

  function finish() {
    active = false;
    var cb = onDone;
    onDone = null;
    if (cb) cb();
  }

  function update(ctx) {
    if (!active) return;
    if (!wrapped) preparePage(ctx);

    if (inChoices) {
      if (G.Input.consumeDir('up')) { choiceIdx = (choiceIdx + choices.length - 1) % choices.length; G.Audio.sfx('blip'); }
      if (G.Input.consumeDir('down')) { choiceIdx = (choiceIdx + 1) % choices.length; G.Audio.sfx('blip'); }
      if (G.Input.consumeAction()) {
        var ch = choices[choiceIdx];
        active = false;
        var cb = onDone; onDone = null;
        if (ch.cb) ch.cb();
        else if (cb) cb();
      }
      return;
    }

    var total = totalChars();
    if (charCount < total) {
      charCount += 2;
      blipTick++;
      if (blipTick % 4 === 0) G.Audio.sfx('tick');
      if (G.Input.consumeAction()) charCount = total; // skip typewriter
    } else if (G.Input.consumeAction()) {
      if (pageIdx < pages.length - 1) {
        pageIdx++;
        preparePage(ctx);
        G.Audio.sfx('blip');
      } else if (choices) {
        inChoices = true;
        G.Audio.sfx('blip');
      } else {
        finish();
      }
    }
  }

  function draw(ctx) {
    if (!active) return;
    var p = pages[pageIdx];
    if (!wrapped) preparePage(ctx);

    var h = 70;
    var y = SH - h - 4;
    drawWindow(ctx, 4, y, SW - 8, h);

    ctx.textBaseline = 'top';
    var tx = 14, ty = y + 12;
    if (p.name) {
      ctx.font = font(8);
      ctx.fillStyle = '#f7d84d';
      ctx.fillText(p.name, tx, ty);
      ty += 13;
    }
    if (p.icon) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(p.icon, SW - 40, y + 20, 24, 24);
    }
    // typewriter across wrapped lines
    ctx.font = font(8);
    ctx.fillStyle = '#f4f4f4';
    var remaining = charCount;
    for (var i = 0; i < wrapped.length; i++) {
      if (remaining <= 0) break;
      var lineText = wrapped[i].slice(0, remaining);
      ctx.fillText(lineText, tx, ty + i * 12);
      remaining -= wrapped[i].length + 1;
    }
    // continue arrow
    if (charCount >= totalChars() && !inChoices) {
      var bounce = Math.floor(Date.now() / 300) % 2;
      ctx.fillStyle = '#f7d84d';
      ctx.beginPath();
      var ax = SW / 2, ay = SH - 14 + bounce;
      ctx.moveTo(ax - 4, ay);
      ctx.lineTo(ax + 4, ay);
      ctx.lineTo(ax, ay + 4);
      ctx.fill();
    }

    if (inChoices) {
      // a titled menu with a lit-up row, so it is obvious these are two
      // buttons the player picks between (and not just more talking)
      ctx.font = font(8);
      var HEAD = G.Lang.t('PICK ONE:');
      var rowH = 16;
      var maxLabel = ctx.measureText(HEAD).width;
      choices.forEach(function (c) {
        maxLabel = Math.max(maxLabel, ctx.measureText(c.label).width);
      });
      var cw = Math.min(SW - 12, Math.max(170, maxLabel + 46));
      var chH = choices.length * rowH + 32;
      var cx = SW - cw - 8, cy = y - chH - 2;
      drawWindow(ctx, cx, cy, cw, chH);
      ctx.font = font(8);
      ctx.fillStyle = '#9fd4e8';
      ctx.fillText(HEAD, cx + 10, cy + 9);
      choiceRects.length = 0;
      for (var c = 0; c < choices.length; c++) {
        var ry = cy + 24 + c * rowH;
        if (c === choiceIdx) {
          ctx.fillStyle = 'rgba(247,216,77,0.22)';
          ctx.fillRect(cx + 6, ry - 4, cw - 12, rowH - 2);
        }
        ctx.fillStyle = c === choiceIdx ? '#f7d84d' : '#f4f4f4';
        ctx.fillText(choices[c].label, cx + 24, ry);
        if (c === choiceIdx) {
          ctx.fillStyle = '#f7d84d';
          ctx.fillText('>', cx + 10, ry);
        }
        // remembered here so a finger hits exactly what it sees
        choiceRects.push({ x: cx, y: ry - 4, w: cw, h: rowH });
      }
    } else {
      choiceRects.length = 0;
    }
  }

  // a finger pressing one of the options. Returns true if it landed on one.
  function tapChoice(gx, gy) {
    if (!active || !inChoices || !choiceRects.length) return false;
    for (var i = 0; i < choiceRects.length; i++) {
      var r = choiceRects[i];
      // a little padding: options are 14px tall, fingertips are not
      if (gx >= r.x - 4 && gx <= r.x + r.w + 4 && gy >= r.y - 3 && gy <= r.y + r.h + 3) {
        if (choiceIdx !== i) { choiceIdx = i; G.Audio.sfx('blip'); }
        var ch = choices[i];
        active = false;
        var cb = onDone; onDone = null;
        choiceRects.length = 0;
        if (ch.cb) ch.cb();
        else if (cb) cb();
        return true;
      }
    }
    return false;
  }

  G.Dialogue = {
    start: start,
    update: update,
    draw: draw,
    drawWindow: drawWindow,
    wrapText: wrapText,
    tapChoice: tapChoice,
    isActive: function () { return active; }
  };
})();
