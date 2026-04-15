export function StatsSection() {
  const stats = [
    {
      value: "10+",
      label: "Real Challenges",
      description: "And growing every week",
    },
    {
      value: "Local",
      label: "Your Machine",
      description: "Learn in your own environment",
    },
    {
      value: "Real",
      label: "Production Scenarios",
      description: "Not toy examples",
    },
    {
      value: "5min",
      label: "Quick Setup",
      description: "Start learning fast",
    },
  ];

  return (
    <section className="py-20 px-4 bg-secondary">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-black text-primary">
                {stat.value}
              </div>
              <div className="text-lg font-black text-foreground">
                {stat.label}
              </div>
              <div className="text-sm font-bold text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
