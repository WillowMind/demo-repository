/* =========================================================
   Willow — landing page interactions and motion
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = () => window.matchMedia("(max-width: 640px)").matches;

  // Re-run a CSS animation class on an element
  const replay = (el, cls = "swap") => {
    if (!el || reduceMotion) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  /* ---------- Split headings into words for the rising reveal ---------- */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="wd" aria-hidden="true"><span style="--w:${i}">${w}</span></span>`)
      .join(" ");
  });

  // Stagger children of grouped reveals
  $$("[data-stagger]").forEach((group) => {
    $$("[data-reveal]", group).forEach((el, i) => el.style.setProperty("--d", `${(i * 0.08).toFixed(2)}s`));
  });

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
      e.target.dispatchEvent(new CustomEvent("revealed"));
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
  const observeReveals = (root = document) =>
    $$("[data-reveal], [data-split]", root).forEach((el) => {
      if (reduceMotion) el.classList.add("in");
      else revealIO.observe(el);
    });
  observeReveals();

  /* ---------- Hero video ---------- */
  const hero = $(".hero");
  const video = $("#heroVideo");
  const videoToggle = $("#videoToggle");
  let userPaused = false;

  const setToggle = (playing) => {
    $(".vt-text", videoToggle).textContent = playing ? "Pause video" : "Play video";
    videoToggle.setAttribute("aria-pressed", String(!playing));
  };
  const reveal = () => hero.classList.add("ready");

  if (reduceMotion) {
    setToggle(false);
    reveal();
  } else {
    const start = () => { const p = video.play(); if (p && p.catch) p.catch(() => setToggle(false)); };
    if (video.readyState >= 3) { start(); requestAnimationFrame(reveal); }
    else {
      video.addEventListener("canplay", () => { start(); reveal(); }, { once: true });
      setTimeout(reveal, 1400); // never keep the headline waiting on a slow connection
    }
    start();
  }

  videoToggle.addEventListener("click", () => {
    if (video.paused) { video.play(); userPaused = false; setToggle(true); }
    else { video.pause(); userPaused = true; setToggle(false); }
  });

  let heroVisible = true;
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (reduceMotion || userPaused) return;
    if (heroVisible) video.play().catch(() => {});
    else video.pause();
  }, { threshold: 0.02 }).observe(hero);

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const menuToggle = $("#menuToggle");
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    $(".menu-label", menuToggle).textContent = open ? "Close" : "Menu";
    document.body.style.overflow = open ? "hidden" : "";
    if (open) nav.classList.remove("tucked");
  };
  menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) setMenu(false); });

  /* ---------- Scroll-driven motion ---------- */
  const statement = $("[data-words]");
  const sText = statement.textContent.trim();
  statement.setAttribute("aria-label", sText);
  statement.innerHTML = sText.split(" ").map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(" ");
  const words = $$(".w", statement);

  const heroMedia = $(".hero-media");
  const heroContent = $("#heroContent");
  const joinSection = $(".join");
  const joinBg = $(".join-bg");
  const progress = $("#progress");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;

    // Nav: solid after the hero, tucks away when scrolling down, returns when scrolling up
    nav.classList.toggle("scrolled", y > vh * 0.55);
    if (!nav.classList.contains("open")) nav.classList.toggle("tucked", y > vh && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("tucked");
    lastY = y;

    // Reading progress
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;

    if (!reduceMotion) {
      // Hero parallax: the river drifts slower than the page, the text lifts away
      if (heroVisible) {
        const t = Math.min(1, y / vh);
        heroMedia.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0) scale(${(1 + t * 0.06).toFixed(4)})`;
        heroContent.style.transform = `translate3d(0, ${(y * -0.12).toFixed(1)}px, 0)`;
        heroContent.style.opacity = String(Math.max(0, 1 - t * 1.4).toFixed(3));
      }

      // Statement lights up word by word as it is read
      const r = statement.getBoundingClientRect();
      const progressWords = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.5)));
      const lit = Math.round(progressWords * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));

      // Join background drifts gently
      const jr = joinSection.getBoundingClientRect();
      if (jr.top < vh && jr.bottom > 0) {
        const p = (jr.top + jr.height / 2 - vh / 2) / vh;
        joinBg.style.transform = `translate3d(0, ${(p * -60).toFixed(1)}px, 0)`;
      }
    }
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  if (reduceMotion) words.forEach((w) => w.classList.add("lit"));

  /* ---------- For today ---------- */
  const moods = {
    heavy: {
      song: { title: "Slow Water", meta: "Piano and soft rain, 4 minutes" },
      story: { title: "The Stone That Floated", meta: "6-minute read",
        line: "The stone had sat at the bottom of the river for so long that it had forgotten it was ever anywhere else." },
      tip: { title: "Make it smaller", meta: "1 minute",
        body: "Pick one task and shrink it. Not “clean the room”, just “put one cup away”. That counts." },
    },
    restless: {
      song: { title: "Tidewalk", meta: "Low strings, 5 minutes" },
      story: { title: "The Night Ferry", meta: "5-minute read",
        line: "The ferryman never hurried, not even when his passengers did." },
      tip: { title: "Box breathing", meta: "2 minutes",
        body: "Breathe in for four, hold for four, out for four, hold for four. Repeat it four times." },
    },
    numb: {
      song: { title: "Small Lights", meta: "Guitar and birdsong, 3 minutes" },
      story: { title: "The Lantern Maker", meta: "7-minute read",
        line: "In a village where every window had gone dark, an old man lit one lantern and set it on his step." },
      tip: { title: "Five things", meta: "2 minutes",
        body: "Name five things you can see, four you can touch, three you can hear, two you can smell and one you can taste." },
    },
    okay: {
      song: { title: "Morning Tide", meta: "Warm keys, 4 minutes" },
      story: { title: "The Willow and the Wind", meta: "4-minute read",
        line: "The wind came every afternoon, and every afternoon the willow let it pass through." },
      tip: { title: "Keep one good thing", meta: "1 minute",
        body: "Write down one thing that went okay today, however small, so you can find it on a harder day." },
    },
  };

  const barsFor = (seed) => {
    let s = seed * 7919;
    return Array.from({ length: 44 }, (_, i) => {
      s = (s * 9301 + 49297) % 233280;
      const h = 24 + Math.round((Math.sin(i / 3.6 + seed) * 0.5 + 0.5) * 48 + (s / 233280) * 26);
      const delay = (-(i * 0.11) % 2.6).toFixed(2);
      return `<i style="height:${h}%;animation-delay:${delay}s"></i>`;
    }).join("");
  };

  const set = $("#set");
  const renderMood = (key, i) => {
    const m = moods[key];
    set.innerHTML = `
      <article class="song">
        <p class="set-kind">Song</p>
        <h3>${m.song.title}</h3>
        <p class="meta">${m.song.meta}</p>
        <div class="bars" aria-hidden="true">${barsFor(i + 1)}</div>
      </article>
      <article class="story">
        <p class="set-kind">Story</p>
        <h3>${m.story.title}</h3>
        <p class="meta">${m.story.meta}</p>
        <blockquote>${m.story.line}</blockquote>
      </article>
      <article class="tip">
        <p class="set-kind">Something to try</p>
        <h3>${m.tip.title}</h3>
        <p class="meta">${m.tip.meta}</p>
        <p class="tip-body">${m.tip.body}</p>
      </article>`;
  };
  const feels = $$(".feel");
  feels.forEach((btn, i) => btn.addEventListener("click", () => {
    if (btn.getAttribute("aria-pressed") === "true") return;
    feels.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    renderMood(btn.dataset.mood, i);
  }));
  renderMood("heavy", 0);

  /* ---------- Privacy slider ---------- */
  const dial = $("#dial");
  const levels = [
    { label: "Alias only", name: "Quiet Heron", initials: "QH", sub: "Joined three weeks ago",
      desc: "Your counsellor knows you only by your alias. Nothing else is shared." },
    { label: "First name", name: "Amaya", initials: "A", sub: "Sharing first name",
      desc: "Your counsellor sees your first name, so conversations can feel more personal." },
    { label: "Full name", name: "Amaya Perera", initials: "AP", sub: "Sharing full name",
      desc: "Your counsellor sees your full name. You can go back to your alias before any session." },
    { label: "Therapy", name: "Amaya Perera", initials: "AP", sub: "Moving to licensed therapy",
      desc: "When you move to a licensed therapist, you choose which goals and notes go with you." },
  ];
  const rows = $$(".view-rows > div");
  const labelItems = $$(".dial-labels li");
  const viewName = $("#viewName"), viewSub = $("#viewSub"), avatar = $("#viewAvatar"), dialDesc = $("#dialDesc");
  let currentLevel = -1;

  const updateDial = () => {
    const lv = Number(dial.value);
    const L = levels[lv];
    dial.style.setProperty("--p", `${(lv / 3) * 100}%`);
    dial.setAttribute("aria-valuetext", L.label);
    if (lv !== currentLevel) {
      if (viewName.textContent !== L.name) replay(viewName);
      if (avatar.textContent !== L.initials) replay(avatar);
      replay(viewSub); replay(dialDesc);
    }
    viewName.textContent = L.name;
    avatar.textContent = L.initials;
    avatar.className = `avatar lv${lv}`;
    viewSub.textContent = L.sub;
    dialDesc.textContent = L.desc;
    labelItems.forEach((li) => li.classList.toggle("active", Number(li.dataset.level) === lv));
    rows.forEach((row) => {
      const min = Number(row.dataset.min);
      if (min === 99) return;
      const hidden = lv < min;
      row.classList.toggle("hidden", hidden);
      $(".val", row).setAttribute("aria-hidden", String(hidden));
      $(".tag", row).setAttribute("aria-hidden", String(!hidden));
    });
    currentLevel = lv;
  };
  dial.addEventListener("input", updateDial);
  labelItems.forEach((li) => li.addEventListener("click", () => { dial.value = li.dataset.level; updateDial(); }));
  updateDial();

  /* ---------- Conversation: alias or name ---------- */
  const convos = {
    alias: [
      { who: "Counsellor", me: false, text: "Hi Quiet Heron. Take your time, there's no rush here." },
      { who: "Quiet Heron", me: true, text: "I don't really know where to start." },
      { who: "Counsellor", me: false, text: "That's okay. We can start with how today has been." },
    ],
    name: [
      { who: "Amaya", me: true, text: "I think I'm ready to use my real name." },
      { who: "Counsellor", me: false, text: "Thank you for telling me, Amaya. Nothing else has to change." },
      { who: "Amaya", me: true, text: "Can I switch back if I want to?" },
    ],
  };
  const convo = $("#convo");
  let convoTimers = [];
  const msgHTML = (m) => `<div class="msg ${m.me ? "me" : "them"}"><p class="who">${m.who}</p><p class="body">${m.text}</p></div>`;

  const playConvo = (key) => {
    convoTimers.forEach(clearTimeout);
    convoTimers = [];
    const list = convos[key];
    if (reduceMotion) { convo.innerHTML = list.map(msgHTML).join(""); return; }
    convo.innerHTML = "";
    let t = 250;
    list.forEach((m) => {
      convoTimers.push(setTimeout(() => {
        const typing = document.createElement("div");
        typing.className = `typing ${m.me ? "me" : ""}`;
        typing.setAttribute("aria-hidden", "true");
        typing.innerHTML = "<i></i><i></i><i></i>";
        convo.appendChild(typing);
      }, t));
      t += 900;
      convoTimers.push(setTimeout(() => {
        const typing = $(".typing", convo);
        if (typing) typing.remove();
        convo.insertAdjacentHTML("beforeend", msgHTML(m));
      }, t));
      t += 650;
    });
  };

  const asSwitch = $(".as-switch");
  const asButtons = $$(".as-switch button");
  const thumb = $(".as-thumb");
  const moveThumb = () => {
    const active = asButtons.find((b) => b.getAttribute("aria-checked") === "true");
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft}px)`;
  };
  asButtons.forEach((b) => b.addEventListener("click", () => {
    if (b.getAttribute("aria-checked") === "true") return;
    asButtons.forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    moveThumb();
    playConvo(b.dataset.as);
  }));
  asSwitch.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const idx = asButtons.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const next = asButtons[(idx + 1) % asButtons.length];
    next.click(); next.focus();
  });
  moveThumb();
  window.addEventListener("resize", moveThumb);
  document.fonts && document.fonts.ready.then(moveThumb);

  // Start the conversation when it comes into view
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    playConvo("alias");
    obs.disconnect();
  }, { threshold: 0.3 }).observe(convo);

  /* ---------- Breathing ---------- */
  const circle = $("#breatheCircle");
  const breatheText = $("#breatheText");
  const breatheBtn = $("#breatheBtn");
  const phases = [
    { cls: "inhale", text: "Breathe in…", ms: 4000 },
    { cls: "hold", text: "Hold gently", ms: 4000 },
    { cls: "exhale", text: "And let it go…", ms: 6000 },
  ];
  let breathing = false, phase = 0, cycles = 0, timer = null;
  const runPhase = () => {
    const p = phases[phase];
    circle.style.setProperty("--t", `${p.ms}ms`);
    circle.className = `breathe-circle ${p.cls}`;
    breatheText.textContent = p.text;
    timer = setTimeout(() => {
      phase = (phase + 1) % phases.length;
      if (phase === 0 && ++cycles >= 4) return stopBreathing(true);
      runPhase();
    }, p.ms);
  };
  const stopBreathing = (finished) => {
    breathing = false;
    clearTimeout(timer);
    circle.style.setProperty("--t", "1.4s");
    circle.className = "breathe-circle idle";
    breatheText.textContent = finished ? "That was about a minute. Well done." : "Start when you're ready.";
    breatheBtn.textContent = finished ? "Breathe again" : "Start breathing";
  };
  breatheBtn.addEventListener("click", () => {
    if (breathing) return stopBreathing(false);
    breathing = true; phase = 0; cycles = 0;
    breatheBtn.textContent = "Stop";
    runPhase();
  });

  /* ---------- Principles and parables ---------- */
  const principles = [
    { title: "Bending isn't breaking.", ref: "The willow in the storm", img: "media/p1.jpg",
      alt: "Willow branches bending around a low morning sun",
      story: [
        "The oak on the hill used to laugh at the willow by the river. “You bow to every breeze,” it said. “I bow to nothing.”",
        "Then came a storm that lasted three nights. In the morning the oak lay on its side with its roots in the air. The willow was still by the river, its branches tangled and its leaves scattered, its roots holding.",
        "Strength isn't refusing to move. It's bending and coming back. Willow is built for the days you bend a long way. We don't measure how upright you stand, only that you're still here in the morning.",
      ] },
    { title: "Your name is yours to give.", ref: "The traveller at the inn", img: "media/p2.jpg",
      alt: "A far riverbank and hills in morning haze",
      story: [
        "A traveller arrived at an inn on a cold night. The keeper asked her name. “Does it matter?” she said.",
        "“You're cold,” he replied, “and the fire is warm. Tell me your name whenever you like.” She stayed three nights before she told him. By then, it was easy.",
        "On Willow you can arrive as anyone. An alias isn't a disguise, it's a way in. Share your name when it feels right, or never. Support shouldn't wait at the door for your ID.",
      ] },
    { title: "Small things add up.", ref: "The stream and the stone", img: "media/p3.jpg",
      alt: "Rings of ripples spreading across still water",
      story: [
        "A stream met a stone in its path. It couldn't move the stone, so it went around it, again and again.",
        "A hundred years later the stone had a smooth hollow worn into its side, shaped exactly like the water. Nothing dramatic happened on any single day.",
        "Feeling better rarely looks like a breakthrough. It looks like a breathing exercise on a Tuesday, a song you play twice, a message you almost didn't send. Small things, repeated, change the shape of stone.",
      ] },
    { title: "Rest is part of it.", ref: "The tide that goes out", img: "media/p4.jpg",
      alt: "Calm water reflecting the far bank",
      story: [
        "Fishermen on the southern coast say you never fight a tide going out. It always comes back, and it brings things with it: driftwood, shells, the odd surprise.",
        "There will be weeks you open Willow every day, and weeks you don't open it at all. Both are part of it.",
        "Willow will never send guilt-trip reminders or keep streaks for you to protect. When you come back, everything will be where you left it.",
      ] },
    { title: "Asking for help is strength.", ref: "The swimmer who waved", img: "media/p5.jpg",
      alt: "The grassy riverbank where the willow stands",
      story: [
        "A strong swimmer once drifted too far out. She was embarrassed to wave for help, because she was supposed to be good at this. When she finally did, a fishing boat reached her within minutes.",
        "Later the fisherman told her: “Everyone gets tired out here. The ones who make it back are the ones who wave.”",
        "Talking to a counsellor isn't proof that something is wrong with you. It's waving. And on Willow, you can wave without saying who you are.",
      ] },
    { title: "There's no right pace.", ref: "The willow in spring", img: "media/p6.jpg",
      alt: "Long willow strands hanging in soft light",
      story: [
        "A willow doesn't hurry spring. It buds when the ground is warm and not a day sooner, and no one calls it late.",
        "Some people book a counsellor in their first week. Some spend months with songs and stories first. Some move on to therapy, and some never need to.",
        "There's no wrong order and no deadline. Willow moves at the pace you set, and the next step will be there when you are.",
      ] },
  ];

  const arrow = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const list = $("#principleList");
  list.innerHTML = principles.map((p, i) => `
    <li data-reveal="up" style="--d:${(i * 0.07).toFixed(2)}s">
      <button type="button" data-index="${i}" aria-haspopup="dialog">
        <span class="p-thumb-wrap"><img class="p-thumb" src="${p.img}" alt="" loading="lazy"></span>
        <span>
          <span class="p-title">${p.title}</span>
          <span class="p-ref">${p.ref}</span>
        </span>
        <span class="p-more">Read the story <i>${arrow}</i></span>
      </button>
    </li>`).join("");
  observeReveals(list);
  principles.forEach((p) => { const im = new Image(); im.src = p.img; });

  const dialog = $("#parable");
  const pImg = $("#parableImg");
  const pBody = $("#parableBody");
  let current = 0, lastTrigger = null;
  const show = (i, animate) => {
    current = (i + principles.length) % principles.length;
    const p = principles[current];
    $("#parableRef").textContent = p.ref;
    $("#parableTitle").textContent = p.title;
    $("#parableStory").innerHTML = p.story.map((s) => `<p>${s}</p>`).join("");
    pImg.src = p.img; pImg.alt = p.alt;
    $("#parableCount").textContent = `${current + 1} of ${principles.length}`;
    $(".parable-text", dialog).scrollTop = 0;
    if (animate) { replay(pImg); replay(pBody); }
  };
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-index]");
    if (!btn) return;
    lastTrigger = btn;
    show(Number(btn.dataset.index), true);
    dialog.showModal();
    document.body.style.overflow = "hidden";
  });
  dialog.addEventListener("close", () => {
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  });
  $("#parableClose").addEventListener("click", () => dialog.close());
  $("#parablePrev").addEventListener("click", () => show(current - 1, true));
  $("#parableNext").addEventListener("click", () => show(current + 1, true));
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(current + 1, true);
    if (e.key === "ArrowLeft") show(current - 1, true);
  });
  // Swipe between stories on touch screens
  let touchX = null;
  dialog.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) show(current + (dx < 0 ? 1 : -1), true);
    touchX = null;
  });

  /* ---------- FAQ: smooth open and close ---------- */
  $$(".faq details").forEach((d) => {
    const summary = $("summary", d);
    const answer = $(".faq-a", d);
    summary.addEventListener("click", (e) => {
      if (reduceMotion || !answer.animate) return;
      e.preventDefault();
      const opts = { duration: 520, easing: "cubic-bezier(.65,0,.35,1)" };
      if (d.open) {
        const h = answer.offsetHeight;
        answer.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0 }], opts).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = answer.offsetHeight;
        answer.animate([{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }], opts);
      }
    });
  });

  /* ---------- Waitlist ---------- */
  const adjectives = ["Quiet", "Gentle", "Still", "Soft", "Silver", "Slow", "Morning", "Calm", "Drifting", "Little"];
  const nouns = ["Heron", "Tide", "River", "Willow", "Lantern", "Harbour", "Moss", "Monsoon", "Pebble", "Kingfisher", "Lotus", "Firefly"];
  const alias = $("#alias");
  $("#suggestAlias").addEventListener("click", () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    alias.value = `${pick(adjectives)} ${pick(nouns)}`;
    replay(alias, "swap");
    if (!isSmall()) alias.focus();
  });

  const form = $("#waitlist");
  const email = $("#email");
  const emailError = $("#emailError");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      email.removeAttribute("aria-invalid");
      void email.offsetWidth;
      email.setAttribute("aria-invalid", "true");
      emailError.textContent = v
        ? "Enter an email address like name@example.com."
        : "Enter your email address so we can let you know when Willow is ready.";
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    emailError.textContent = "";
    const name = alias.value.trim();
    $("#doneTitle").textContent = name ? `You've joined the waitlist, ${name}.` : "You've joined the waitlist.";
    form.hidden = true;
    const done = $("#joinDone");
    done.hidden = false;
    done.focus({ preventScroll: true });
  });
  email.addEventListener("input", () => {
    if (email.hasAttribute("aria-invalid")) { email.removeAttribute("aria-invalid"); emailError.textContent = ""; }
  });

  $("#year").textContent = new Date().getFullYear();
})();
