import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    for i, char in enumerate(content):
        if char == '{': stack.append(('{', i))
        elif char == '}':
            if not stack or stack[-1][0] != '{':
                line = content[:i].count('\n') + 1
                col = i - content.rfind('\n', 0, i)
                print('Unmatched } at Line {}, Col {}'.format(line, col))
                if stack: print('Expected to close {} from Line {}'.format(stack[-1][0], content[:stack[-1][1]].count("\n") + 1))
            else:
                stack.pop()
        elif char == '(': stack.append(('(', i))
        elif char == ')':
            if not stack or stack[-1][0] != '(':
                line = content[:i].count('\n') + 1
                col = i - content.rfind('\n', 0, i)
                print('Unmatched ) at Line {}, Col {}'.format(line, col))
                if stack: print('Expected to close {} from Line {}'.format(stack[-1][0], content[:stack[-1][1]].count("\n") + 1))
            else:
                stack.pop()
        elif char == '[': stack.append(('[', i))
        elif char == ']':
            if not stack or stack[-1][0] != '[':
                line = content[:i].count('\n') + 1
                col = i - content.rfind('\n', 0, i)
                print('Unmatched ] at Line {}, Col {}'.format(line, col))
            else:
                stack.pop()
    
    if stack:
        for s in stack:
            line = content[:s[1]].count('\n') + 1
            col = s[1] - content.rfind('\n', 0, s[1])
            print('Unclosed {} at Line {}, Col {}'.format(s[0], line, col))

check_balance('src/pages/Reporting/FuelmanReport/FuelmanReport.tsx')
