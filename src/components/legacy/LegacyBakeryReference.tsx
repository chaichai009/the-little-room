const pastries = ["roll", "loaf", "tart", "bun", "cake", "cookie"];

/** Preserved DOM/CSS concept from the first visual direction. It is not rendered by the current home page. */
export function LegacyBakeryReference() {
  return (
    <main className="bakery-page">
      <header className="tiny-header"><a href="#home" className="tiny-wordmark">the little room</a><span>est. in small things</span></header>
      <section className="bakery-room" id="home" aria-labelledby="bakery-title">
        <div className="striped-wall" /><div className="room-moulding" />
        <div className="bakery-sign"><span className="berry berry-left" /><div><p>the little room</p><h1 id="bakery-title">bake shop</h1></div><span className="berry berry-right" /></div>
        <div className="wall-clock" aria-label="Decorative strawberry clock"><i /><b /></div>
        <aside className="side-shelf shelf-left" aria-label="About and notes"><span className="shelf-top">little pantry</span><div className="jar jar-sage"><i /></div><a href="#about" className="mini-label label-about">about</a><div className="jar jar-cream"><i /></div><a href="#notes" className="mini-label label-notes">notes</a><span className="shelf-feet" /></aside>
        <section className="display-case" aria-label="Miniature bakery display">
          <div className="case-awning"><i /><i /><i /><i /><i /></div>
          <div className="case-shelf shelf-one">{pastries.slice(0, 2).map((pastry) => <span className={`pastry ${pastry}`} key={pastry} />)}<span className="pastry croissant" /><span className="showcase-jar" /><a href="#projects" className="price-card">projects<br /><b>fresh work</b></a></div>
          <div className="case-shelf shelf-two">{pastries.slice(2, 4).map((pastry) => <span className={`pastry ${pastry}`} key={pastry} />)}<span className="pastry madeleine" /><span className="gift-box" /><a href="#archive" className="price-card">archive<br /><b>old crumbs</b></a></div>
          <div className="case-shelf shelf-three">{pastries.slice(4).map((pastry) => <span className={`pastry ${pastry}`} key={pastry} />)}<span className="tiny-cake" /><span className="paper-bag" /></div>
          <div className="case-plinth"><span>made in miniature</span></div><span className="case-feet" />
        </section>
        <aside className="side-shelf shelf-right" aria-label="Small bakery counter"><span className="shelf-top">today&apos;s jam</span><div className="jam-jar"><i /></div><div className="jam-jar strawberry"><i /></div><span className="paper-price">two sweet things<br />for later</span><div className="tiny-door"><a href="#contact">contact</a></div><span className="shelf-feet" /></aside>
        <div className="round-table" aria-label="Miniature cafe table"><div className="table-top"><span className="cake-plate"><i /></span><span className="napkin" /></div><div className="table-leg" /><a href="#contact" className="table-note">say hello</a></div>
        <div className="hamster-mascot" data-mascot="hamster" role="img" aria-label="A tiny white and caramel hamster mascot resting beside the cafe table"><span className="hamster-body" /><span className="hamster-head"><span className="hamster-patch" /><span className="hamster-ear hamster-ear-left" /><span className="hamster-ear hamster-ear-right" /><span className="hamster-eye hamster-eye-left" /><span className="hamster-eye hamster-eye-right" /><span className="hamster-nose" /></span><span className="hamster-paw hamster-paw-left" /><span className="hamster-paw hamster-paw-right" /><span className="hamster-cookie" /></div>
        <div className="tile-floor" /><p className="room-caption">a small place for projects, notes, and sweet little things.</p>
      </section>
    </main>
  );
}
