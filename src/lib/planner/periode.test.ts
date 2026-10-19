import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseerPeriode, PERIODE_OPTIES, PERIODE_STANDAARD } from './periode';
import { normaliseerKeuzes } from './normaliseer';
import { planLokaal, STANDAARD_AANTAL_DAGEN } from './lokaal';
import type { PlanVerzoek } from './types';
import { standaardProfiel } from '@/lib/profiel';

const basis: PlanVerzoek = { kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 7 };
