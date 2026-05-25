import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { findMatches, type PatientCandidate, type MatchResult } from "@/lib/import/fuzzy-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DedupRequest = {
  candidates: PatientCandidate[];
};

type DedupResponse = {
  matches: { candidateIdx: number; possibleMatches: MatchResult[] }[];
};

export async function POST(req: NextRequest): Promise<NextResponse<DedupResponse | { error: string }>> {
  try {
    const body = (await req.json()) as DedupRequest;
    if (!Array.isArray(body.candidates)) {
      return NextResponse.json({ error: "candidates[] requis" }, { status: 400 });
    }

    const existing = await prisma.patient.findMany({
      select: { id: true, nom: true, prenom: true, email: true, dateNaissance: true }
    });

    const matches = body.candidates.map((c, i) => ({
      candidateIdx: i,
      possibleMatches: findMatches(c, existing, { minScore: 60, max: 5 })
    }));

    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
