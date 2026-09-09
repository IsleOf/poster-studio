#!/usr/bin/env python3
"""Read-only project-map validator. No application or runtime operations.

Based on the structural contract in Agentic Universe tools/knowledge_graph.py;
adds project vocabulary, evidence existence and orphan checks. The owner-approved
2026-09-09 increment adds refines and optional verification_state.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / 'knowledge/graph/poster-studio_project_graph.json'
TYPES = {'component', 'decision', 'constraint', 'bug', 'question'}
RELATIONS = {'implements', 'depends_on', 'records', 'blocks', 'challenges', 'refines'}


def validate(graph, check_evidence=True):
    errors = []
    nodes, edges = graph.get('nodes', []), graph.get('edges', [])
    if not isinstance(nodes, list) or not isinstance(edges, list):
        return ['nodes and edges must be arrays']
    ids, edge_ids, triples, connected = set(), set(), set(), set()
    for node in nodes:
        ident = node.get('id')
        if not ident or ident in ids:
            errors.append(f'missing/duplicate node id: {ident}')
        ids.add(ident)
        for key in ('label', 'description', 'derived_from'):
            if not node.get(key):
                errors.append(f'{ident}: missing {key}')
        if node.get('type') not in TYPES:
            errors.append(f'{ident}: invalid type')
        if node.get('status') not in {'active', 'to_fill', 'open', 'resolved', 'deprecated'}:
            errors.append(f'{ident}: invalid status')
        confidence = node.get('confidence')
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            errors.append(f'{ident}: invalid confidence')
        if 'verification_state' in node and node['verification_state'] not in {'verified', 'unverified'}:
            errors.append(f'{ident}: invalid verification_state')
        refs = node.get('derived_from', [])
        if not isinstance(refs, list):
            errors.append(f'{ident}: derived_from must be an array')
            continue
        for ref in refs:
            if not isinstance(ref, str) or not ref.strip():
                errors.append(f'{ident}: invalid evidence reference')
                continue
            if not check_evidence:
                continue
            if ref.startswith('commit:'):
                result = subprocess.run(['git', 'cat-file', '-e', ref[7:] + '^{commit}'], cwd=ROOT, capture_output=True)
                exists = result.returncode == 0
            else:
                path = re.sub(r':\d+(?:[-,]\d+)*$', '', ref)
                exists = (ROOT / path).is_file()
            if not exists:
                errors.append(f'{ident}: evidence unavailable: {ref}')
    for edge in edges:
        ident = edge.get('id')
        if not ident or ident in edge_ids:
            errors.append(f'missing/duplicate edge id: {ident}')
        edge_ids.add(ident)
        source, target = edge.get('source'), edge.get('target')
        if source not in ids or target not in ids:
            errors.append(f'{ident}: dangling edge')
        connected.update((source, target))
        if edge.get('type') not in RELATIONS or not edge.get('description'):
            errors.append(f'{ident}: missing description/invalid relation')
        triple = (source, target, edge.get('type'))
        if triple in triples:
            errors.append(f'{ident}: duplicate relation')
        triples.add(triple)
    for orphan in sorted(ids - connected, key=str):
        errors.append(f'orphan: {orphan}')
    if not nodes:
        errors.append('empty graph')
    return errors


def main():
    if sys.argv[1:] != ['validate']:
        print('Usage: python tools/knowledge_graph.py validate', file=sys.stderr)
        return 2
    try:
        graph = json.loads(GRAPH.read_text())
        errors = validate(graph)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        print(f'INVALID: {exc}')
        return 1
    if errors:
        print('INVALID\n' + '\n'.join(errors))
        return 1
    print(f"VALID — {len(graph['nodes'])} nodes / {len(graph['edges'])} edges; zero orphans; zero dangling edges")
    return 0


if __name__ == '__main__':
    sys.exit(main())
