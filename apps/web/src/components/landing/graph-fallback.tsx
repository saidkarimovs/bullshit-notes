export function GraphFallback() {
  const nodes = Array.from({ length: 27 }, (_, index) => {
    const angle = index * 2.39996, radius = 10 + Math.sqrt(index) * 8;
    return { x: Number((50 + Math.cos(angle) * radius).toFixed(3)), y: Number((50 + Math.sin(angle) * radius).toFixed(3)), r: index % 7 === 0 ? 1.1 : .55 };
  });
  return <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true"><g stroke="var(--color-border-strong)" strokeWidth=".14" opacity=".6">{nodes.map((node, index) => <line key={index} x1={node.x} y1={node.y} x2={nodes[(index * 7 + 9) % nodes.length].x} y2={nodes[(index * 7 + 9) % nodes.length].y} />)}</g>{nodes.map((node,index) => <circle key={index} cx={node.x} cy={node.y} r={node.r} fill={index % 7 === 0 ? "var(--color-accent)" : "var(--color-border-strong)"} />)}</svg>;
}

