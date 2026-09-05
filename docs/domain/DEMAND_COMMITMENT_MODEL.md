# Demand & Commitment Model

## Status

**Deferred-scope investigation note — not active.**

The first release is an Engineering quarterly-planning system (`OPEN_DECISIONS.md` D6);
enterprise-wide commercial request negotiation is deferred. This document imposes no
requirement on the first release and is subordinate to the active documents listed in
`README.md`. Several questions below were answered pre-reset by D5 (Need and WorkPackage are
separate and many-to-many; a Commitment is its own record, never inferred from an
assignment; a commitment may cover part of a request); those answers are deferred with the
scope, not reopened, and the full pre-reset text is at git tag
`checkpoint/pre-engineering-quarterly-reset`. The quarterly commitment that *is* in scope
lives in `QUARTERLY_PLANNING_MODEL.md`.

This document exists to investigate how Commercial Division needs become Product priorities, agreements and delivery commitments.

Do not translate this document into database entities until the domain semantics are agreed.

## Business Context

Commercial Divisions such as OEM, Dealer Solutions, Europe and Financial Services / FSAAS express customer, market and business needs.

Product is a shared organization with finite capacity and its own portfolio priorities.

Commercial and Product groups generally need enough agreement on upcoming priorities before both sides can confidently plan quarterly resources.

The working conceptual flow is:

**Commercial need → request/demand → prioritization → agreement/commitment → quarterly workforce planning**

The exact terminology, lifecycle and cardinality are unresolved.

## Questions to Investigate

1. What is the smallest meaningful unit of Commercial demand?
2. Can one Commercial need require multiple Product capabilities or bodies of work?
3. Can multiple Commercial Divisions share the same demand?
4. Who owns a demand before Product accepts it?
5. What does prioritization mean versus commitment?
6. Is Product commitment binary, staged or confidence-based?
7. Can Product commit to part of a request?
8. Does a commitment need a target quarter, target date or planning horizon?
9. What happens when a Product priority changes after Commercial has planned resources around it?
10. How should custom-software work owned within a Commercial Division relate to Product commitments it depends on?
11. How are cross-division conflicts in Product capacity represented?
12. Is `Commitment` a durable domain concept or merely a state of another concept?

## Important Distinctions

Preserve the distinction between:

**Something Commercial wants**

and

**Something Product has agreed or committed to support/deliver.**

Also distinguish:

- demand ownership;
- work ownership;
- capability ownership;
- workforce allocation;
- dependency.

These relationships may overlap in a business situation but are not interchangeable.

## Evidence to Collect

During V1 and workforce-planner extraction, look for:

- request or intake concepts;
- priority fields;
- approval or commitment states;
- quarter planning workflows;
- Product versus Commercial ownership;
- requested versus accepted dates;
- dependency tracking;
- portfolio ranking;
- funding or capacity decisions;
- status transitions that imply commitment;
- UI terminology used during planning conversations.

Use **OBSERVED**, **INFERRED** and **UNKNOWN** when recording evidence.

## Domain Tests / Example Questions

A future model should be able to represent questions such as:

- OEM needs Feature X in Q4. Has Product committed to it?
- Dealer Solutions and Europe both require the same Product enhancement. Is this one demand or two?
- Commercial has staffed a custom-software team for Q1, but its required Product feature moved to Q2. What commitment is now at risk?
- Product can satisfy only part of a Commercial request this quarter. How is that represented?
- Two Commercial Divisions compete for the same constrained Product capability. How is prioritization expressed?

## Open Decisions

No final domain entities are approved by this document.

Candidate terms to evaluate include:

- Need
- Request
- Demand
- Priority
- Commitment
- Agreement
- Outcome

Prefer the smallest set of concepts that correspond to genuinely different business behaviour.