import assert from 'node:assert/strict';
import test from 'node:test';
import { findOwnerUser, mapRowToLeadInput } from '../src/routes/importExport';

const users = [
  { id: 'u1', name: 'Grazi Santos', email: 'grazi@example.com' },
  { id: 'u2', name: 'Maria Oliveira', email: 'maria@example.com' },
];

test('mapRowToLeadInput prefers exported responsible email when present', () => {
  const lead = mapRowToLeadInput({
    Nome: 'Lead de teste',
    Responsavel: 'Nome antigo',
    EmailResponsavel: 'grazi@example.com',
  });

  assert.equal(lead.owner, 'grazi@example.com');
});

test('mapRowToLeadInput reads accented responsible headers', () => {
  const lead = mapRowToLeadInput({
    Nome: 'Lead de teste',
    ['Respons\u00e1vel']: 'Grazi Santos',
  });

  assert.equal(lead.owner, 'Grazi Santos');
});

test('findOwnerUser matches a unique owner token in a decorated value', () => {
  const owner = findOwnerUser(users, 'grazi - carteira ativa');

  assert.equal(owner?.id, 'u1');
});
