# Research notes

Math foundations, references, and design findings for the 7-element cyclic CA.

## 1. Why 7? (and why not 6)

A tournament is a complete directed graph: for every pair of elements, exactly
one beats the other. It is **regular** (balanced) when every element beats as
many as it loses to. That requires each element to have out-degree (n-1)/2,
which is only an integer for **odd n**. So:

- **6 elements can never be clean RPS.** Someone always beats 3 and loses 2 (or
  vice versa). This is the structural reason "5 colors + artifacts" in Magic
  never feels like a symmetric wheel — the 6th sits outside the balance.
- **3, 5, 7, ...** are the balanced sizes.

7 is special beyond mere balance: it is the smallest size with a **doubly
regular** tournament — one where every *ordered pair* of elements has exactly
the same number of common predators (here, exactly one). Concretely:

> For any two elements A and B, there is always a third element C that beats
> both of them.

That is the "2-paradox": no pair of elements can form a dominating coalition,
because a third always overpowers them. It is why a 7-element field never
collapses to a stable duopoly the way smaller sets can.

## 2. The Paley / quadratic-residue construction

Label elements 0..6. Element x beats x+1, x+2, x+4 (mod 7). The offsets
{1, 2, 4} are exactly the **quadratic residues mod 7** (1=1^2, 4=2^2, 2=3^2
mod 7). This is the Paley tournament QR(7). It is, up to relabeling, the unique
doubly regular tournament on 7 vertices.

- Each element beats 3 and loses to 3.
- Non-residues {3, 5, 6} are the offsets by which x is *beaten*.

`tournament.js` implements this generically: `makeTournament(n, skipSet)` lets
you build any cyclic tournament. PALEY7 = `makeTournament(7, [1,2,4])`.

## 3. OEIS A362137 / the Erdos-Schutte problem

A362137 counts the minimum vertices in a tournament such that every set of k
vertices has a common dominator (Schutte's problem, studied by Erdos, Graham &
Spencer, Szekeres). The sequence begins 1, 3, 7, ... :

- n=1 (k=0): trivial.
- **n=2: 7 vertices**, vertex x dominating x+1, x+2, x+4 mod 7 — exactly our
  construction. This is the smallest tournament where every *pair* has a common
  dominator.
- n=3 needs at least 19 vertices, etc. (bounds grow ~ k^2 2^k).

So "the 7-element system" is literally the n=2 entry of this sequence — the
first non-trivial level of the paradox. Reference:
`https://oeis.org/A362137`.

## 4. Triangle census in QR(7)

Of the C(7,3) = 35 three-element subsets:

- **14 are cyclic** (A beats B beats C beats A — a 3-cycle). These are the
  stable RPS sub-ecosystems: if only such a triple is active, the three
  elements oscillate forever, no winner.
- **21 are transitive** (one element beats the other two — a Condorcet winner
  exists). If only such a triple is active, the dominator swallows the map.

Count check: cyclic triangles = C(n,3) - sum_v C(outdeg_v, 2)
= 35 - 7*C(3,2) = 35 - 21 = 14. Confirmed.

The status line in the PoC uses `classifySubset()` to detect which case the
current active set falls into, which is the in-UI surfacing of "stable subsets
of rock-paper-scissor within the 2-paradox".

## 5. The CA rule families

Both operate on the 6-neighbor hex (pointy-top) neighborhood.

### Threshold (deterministic)
Greenberg-Hastings / Bays cyclic CA / Softology "RPS-CA". A cell of element s
flips to predator e if e holds >= T of the 6 neighbors. Empty land is claimed
by the element with the most neighbors (>= T).

Regimes on 6 neighbors / 7 elements:
- T=1: boiling chaos.
- **T=2: coherent travelling fronts (default).**
- T=3: crystallizes into slow / near-static domains.
- T>=4: mostly frozen (4 of 6 matching neighbors is rare).

Note: the classic 3-element RPS-CA uses 8 Moore neighbors with T=3. Porting
that T to a 6-neighbor / 7-element setting is what made the first PoC look dead;
the threshold must be retuned to the neighborhood.

### Stochastic (sampling)
Stenseke "Pokemon" infection. Each cell samples ONE random neighbor; if that
neighbor's element beats it (or the cell is empty and the neighbor is alive),
the cell is absorbed. Never reaches a true fixed point — perpetual fuzzy
spirals, closest to the reference video's organic texture.

References:
- Softology, "Rock Paper Scissors Cellular Automata":
  `https://softologyblog.wordpress.com/2018/03/23/rock-paper-scissors-cellular-automata/`
- Stenseke, CellularAutomataElements (stochastic / Pokemon rule):
  `https://github.com/JakobStenseke/CellularAutomataElements`
- Red Blob Games, hex grid reference:
  `https://www.redblobgames.com/grids/hexagons/`

## 6. Element-set options for 7

| System            | The 7                                            | Why                                                  |
|-------------------|--------------------------------------------------|------------------------------------------------------|
| Wuxing + Godai    | Wood Fire Earth Metal Water + Wind Void(Aether)  | Chinese 5 + the 2 Japanese Godai adds; the screenshots; fits Ryukyu animism |
| ROYGBIV / chakra  | Red Orange Yellow Green Blue Indigo Violet       | already 7 maximally separated hues; violet wraps to red — best legibility |
| Alchemical metals | Gold Silver Mercury Copper Iron Tin Lead         | transmutation chains give pre-built directional lore |
| I Ching trigrams  | 7 of the 8 Bagua                                 | built-in opposition pairs                            |
| Classical planets | Sun Moon Mars Mercury Jupiter Venus Saturn       | overlaps metals; weekday familiarity                 |

Wuxing itself is a "2-paradox" precedent: it runs two interlocking 5-cycles, the
generating cycle 生 (Wood->Fire->Earth->Metal->Water->Wood) and the overcoming
cycle 克 (Wood->Earth->Water->Fire->Metal->Wood). Generalizing "3 beats / 3
loses" on 7 elements is the Paley tournament.

For Magic: the Gathering specifically, getting to a clean 7 means adding two
genuine factions, not hybrids: Colorless/Artifact (the machine) and a spreading
corruption — Phyrexian oil/compleation is the natural fit, since it is already a
contagion mechanic and reads as a converting CA front. WUBRG + Artifact +
Phyrexia = 7.

## 7. Fitting lore onto the 14 cyclic triples (open design task)

Swapping palettes never changes who beats whom — index i keeps its edges. To
make the dominance read as thematically sensible you instead choose an
**ordering** of names onto indices 0..6 so the {1,2,4}-mod-7 edges align with
"this consumes that" intuitions. There are 7! orderings (7!/(7*2)=360 distinct
up to the tournament's automorphisms). A small search can score orderings by how
many edges match a hand-authored "should beat" preference matrix and surface the
best few. This is worth doing before locking a theme.

## 8. Nested 2-paradox (extension path)

Poddiakov, "Self-Similar Structures of Nontransitive Dice Sets" (Lo Shu magic
square): RPS relations can nest — 3 groups of 3 forming a meta-RPS (9 elements),
then 3 groups of 3 groups of 3 (27). If you want literal "RPS within RPS" rather
than the abstract doubly-regular 7, a 9-element set split into 3 macro-groups
gives explicit two-level structure with a visibly different map texture.
Reference: `https://arxiv.org/abs/2311.12811`.

## 9. Social-cycle-theory framing

The user's original framing (Plato's kingship/aristocracy/democracy as RPS;
social cycle theory) maps naturally: each "regime" is an element, instability is
the predator relationship, and introducing a new element/regime is reactivating
a chip with a seed. The CA is a spatial, many-regime generalization of those
cyclic political-succession models. Reference:
`https://en.wikipedia.org/wiki/Social_cycle_theory`.
