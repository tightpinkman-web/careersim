import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EvaluationTrigger from "@/components/results/EvaluationTrigger";
import ResultsDashboard from "@/components/results/ResultsDashboard";
import type { CareerType, SimulationMode } from "@/types/simulation";

export default async function SimulationResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
  if (!session) notFound();

  const hasEvaluation =
    session.overallScore !== null &&
    session.competencies !== null &&
    session.keyStrengths.length > 0 &&
    session.growthAreas.length > 0 &&
    !!session.careerFitSummary;

  if (!hasEvaluation) {
    return <EvaluationTrigger sessionId={session.id} />;
  }

  return (
    <ResultsDashboard
      sessionId={session.id}
      careerType={session.careerType as CareerType}
      mode={session.mode as SimulationMode}
      overallScore={session.overallScore!}
      competencies={session.competencies as Record<string, number>}
      keyStrengths={session.keyStrengths}
      growthAreas={session.growthAreas}
      careerFitSummary={session.careerFitSummary!}
      verificationHash={session.verificationHash}
    />
  );
}
