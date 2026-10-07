import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeSelection,
  selectionSummary,
  validReference,
  buildBrief,
} from '../src/lib/selection.mjs'
test('selection keeps distinct types, rejects invalid entries and deduplicates safely', () => {
  const result = sanitizeSelection([
    { id: '1', type: 'color', label: 'Бордовый' },
    { id: '1', type: 'material', label: 'Бархат' },
    { id: '1', type: 'color' },
    null,
    { id: '2', type: 'script' },
    { id: 'prototype', type: 'toString' },
    { id: '', type: 'product' },
    { id: '3', type: 'product', url: '//evil.example' },
  ])
  assert.equal(result.length, 3)
  assert.equal(result[2].url, undefined)
  assert.match(selectionSummary(result), /Цвет: Бордовый/)
  assert.equal(
    sanitizeSelection([
      { id: 'unsafe', type: 'product', url: '/\\evil.example' },
    ])[0].url,
    undefined,
  )
  assert.equal(
    sanitizeSelection(
      Array.from({ length: 30 }, (_, i) => ({ id: String(i), type: 'color' })),
    ).length,
    24,
  )
})
test('references allow optional HTTPS links but reject scripts, credentials and malformed URLs', () => {
  for (const value of ['', 'https://example.com/my-reference.jpg'])
    assert.equal(validReference(value), true)
  for (const value of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:password@example.com',
    'photo.jpg',
  ])
    assert.equal(validReference(value), false)
})
test('brief includes all selected dimensions and ideas without losing optional fields', () => {
  const brief = buildBrief(
    {
      product: 'Кызга сеп',
      composition: '4 подушки',
      dimensions: '80 × 300 см',
      budget: '40000',
      reference: 'https://example.com/photo.jpg',
    },
    [{ type: 'color', id: 'burgundy', label: 'Бордовый' }],
  )
  for (const text of [
    '4 подушки',
    '80 × 300 см',
    '40000',
    'https://example.com/photo.jpg',
    'Цвет: Бордовый',
  ])
    assert.ok(brief.includes(text))
  assert.ok(!brief.includes('undefined'))
  assert.match(
    selectionSummary([
      { type: 'product', id: 'old-favorite-id', label: 'Сохранённое изделие' },
    ]),
    /old-favorite-id/,
  )
  assert.match(
    selectionSummary([
      { type: 'product', id: 'p1', label: 'Курак', url: '/product/kurak' },
    ]),
    /\/product\/kurak/,
  )
})
