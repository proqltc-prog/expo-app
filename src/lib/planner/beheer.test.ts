import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { planLokaal } from '@/lib/planner/lokaal';
import { Profiel, standaardProfiel } from '@/lib/profiel';

describe('magPlanWijzigen', () => {
  it('de beheerder mag het plan wijzigen', () => {
    assert.equal(magPlanWijzigen({ beheerder: 'ik' }, 'ik'), true);
  });

  it('een ander gezinslid mag het plan niet wijzigen', () => {
    assert.equal(magPlanWijzigen({ beheerder: 'ik' }, 'partner'), false);
  });

  it('een plan zonder beheerder mag iedereen wijzigen (plan zonder gezin)', () => {
    assert.equal(magPlanWijzigen({}, 'partner'), true);
  });

  it('een niet-aangemelde gebruiker mag wijzigen (geen gezin, geen beheer)', () => {
    assert.equal(magPlanWijzigen({ beheerder: 'ik' }, undefined), true);
  });
});

describe('beheerderNaam', () => {
  const leden = [
    { id: 'ik', naam: 'Maarten' },
    { id: 'partner', naam: 'Sofie' },
  ];

  it('geeft de naam van de beheerder', () => {
    assert.equal(beheerderNaam(leden, 'partner'), 'Sofie');
  });

  it('geeft undefined zonder beheerder of als die niet bij de leden staat', () => {
    assert.equal(beheerderNaam(leden, undefined), undefined);
    assert.equal(beheerderNaam(leden, 'vertrokken'), undefined);
  });
});

describe('beheerder op het weekplan (regressie)', () => {
  const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 2 };
  const plan = planLokaal({ kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 42 });

  it('bewaart de beheerder bij het inlezen', () => {
    const ingelezen = normaliseerWeekplan(JSON.parse(JSON.stringify({ ...plan, beheerder: 'ik' })));
    assert.equal(ingelezen?.beheerder, 'ik');
  });

  it('een plan zonder beheerder blijft zonder beheerder', () => {
    const ingelezen = normaliseerWeekplan(JSON.parse(JSON.stringify(plan)));
    assert.equal(ingelezen !== null && 'beheerder' in ingelezen, false);
  });
});
