class Toc extends HTMLElement {
  private observer?: IntersectionObserver;
  private headings: HTMLHeadingElement[] = [];
  private links: HTMLAnchorElement[] = [];
  private details?: HTMLDetailsElement;
  private resizeTimer?: number;
  private initialized = false;

  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;

    this.links = [...this.querySelectorAll<HTMLAnchorElement>("[data-toc] a")];
    const headingIds = new Set(this.links.map((link) => this.getLinkId(link)));
    const article = this.querySelector("article");
    this.headings = article
      ? [
          ...article.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"),
        ].filter((heading) => headingIds.has(heading.id))
      : [];
    this.details =
      this.querySelector<HTMLDetailsElement>("[data-toc-mobile] details") ??
      undefined;

    if (this.links.length === 0) return;

    this.addEventListener("click", this.onLocalClick);
    window.addEventListener("click", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);

    if (this.headings.length === 0) return;

    window.addEventListener("resize", this.onResize);
    this.observeHeadings();
    this.syncCurrent();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    if (this.resizeTimer !== undefined) window.clearTimeout(this.resizeTimer);
    this.removeEventListener("click", this.onLocalClick);
    window.removeEventListener("click", this.onWindowClick);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this.onResize);
    this.initialized = false;
  }

  private observeHeadings() {
    this.observer?.disconnect();
    const top = this.topOffset();
    const bottom = Math.max(0, window.innerHeight - top - 53);
    this.observer = new IntersectionObserver(this.updateCurrent, {
      rootMargin: `-${top}px 0px -${bottom}px 0px`,
    });
    this.headings.forEach((heading) => this.observer?.observe(heading));
  }

  private getLinkId(link: HTMLAnchorElement): string {
    try {
      return decodeURIComponent(link.hash.slice(1));
    } catch {
      return link.hash.slice(1);
    }
  }

  private topOffset(): number {
    const mobileTocHeight =
      this.details?.querySelector("summary")?.getBoundingClientRect().height ??
      0;
    return Math.round(mobileTocHeight + 32);
  }

  private updateCurrent: IntersectionObserverCallback = () => {
    this.syncCurrent();
  };

  private syncCurrent() {
    const threshold = this.topOffset() + 1;
    let current = this.headings[0];

    for (const heading of this.headings) {
      if (heading.getBoundingClientRect().top > threshold) break;
      current = heading;
    }

    if (!current) return;
    this.links.forEach((link) => {
      if (this.getLinkId(link) === current.id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    const display = this.querySelector<HTMLElement>("[data-toc-current]");
    if (display) display.textContent = current.textContent;
  }

  private closeMobileToc(restoreFocus = false) {
    if (!this.details?.open) return;
    const hadFocus = this.details.contains(document.activeElement);
    this.details.open = false;
    if (restoreFocus && hadFocus) {
      this.details.querySelector<HTMLElement>("summary")?.focus();
    }
  }

  private onLocalClick = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-toc-mobile] a")) {
      this.closeMobileToc();
    }
  };

  private onWindowClick = (event: MouseEvent) => {
    if (
      this.details &&
      event.target instanceof Node &&
      !this.details.contains(event.target)
    ) {
      this.closeMobileToc();
    }
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.closeMobileToc(true);
  };

  private onResize = () => {
    if (this.resizeTimer !== undefined) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = undefined;
      this.observeHeadings();
      this.syncCurrent();
    }, 200);
  };
}

if (!customElements.get("toc-root")) {
  customElements.define("toc-root", Toc);
}
