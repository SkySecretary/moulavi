# Contributing to NuSync

Thank you for your interest in contributing to the NuSync system! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and constructive
- Focus on what's best for the community
- Show empathy towards other contributors

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (error messages, logs, screenshots)

When creating a bug report, include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Include:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Any relevant examples

### Code Contributions

#### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/moulavi-erp.git
   cd moulavi-erp
   ```

3. Install dependencies:
   ```bash
   npm run install:all
   ```

4. Set up the database (see SETUP_GUIDE.md)

5. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Coding Standards

**Backend (TypeScript/Express)**
- Use TypeScript for all new code
- Follow existing code structure
- Use async/await for asynchronous operations
- Add JSDoc comments for public functions
- Handle errors properly with try/catch
- Use meaningful variable names

**Frontend (TypeScript/Next.js)**
- Use TypeScript and React hooks
- Follow component structure in existing code
- Use shadcn/ui components when possible
- Keep components focused and reusable
- Add PropTypes or TypeScript interfaces
- Use Tailwind CSS for styling

**General**
- Write clean, readable code
- Keep functions small and focused
- Add comments for complex logic
- Follow DRY (Don't Repeat Yourself)
- Use meaningful commit messages

#### Commit Messages

Follow this format:
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password reset functionality

- Add password reset request endpoint
- Implement email with reset token
- Create reset password form

Closes #123
```

```
fix(party): resolve search filter bug

The search was not properly filtering by email.
Fixed by updating the query parameter.
```

#### Pull Request Process

1. **Before submitting:**
   - Test your changes thoroughly
   - Update documentation if needed
   - Run linter and fix issues
   - Ensure no console errors

2. **Creating PR:**
   - Use clear, descriptive title
   - Describe what changes were made and why
   - Reference related issues
   - Add screenshots for UI changes

3. **After submitting:**
   - Respond to review comments
   - Make requested changes
   - Keep the PR updated with main branch

#### Testing

Before submitting a PR:

**Backend:**
```bash
cd backend
# Run linter
npm run lint
# Test endpoints manually or with Postman
```

**Frontend:**
```bash
cd frontend
# Run linter
npm run lint
# Test in browser
npm run dev
```

### Documentation

- Update README.md for major changes
- Add comments for complex code
- Update API documentation
- Include examples where helpful

## Development Workflow

1. **Create Issue**: Describe what you want to work on
2. **Get Assigned**: Wait for approval/assignment
3. **Create Branch**: From main branch
4. **Make Changes**: Follow coding standards
5. **Test Locally**: Ensure everything works
6. **Commit Changes**: Use conventional commits
7. **Push Branch**: To your fork
8. **Create PR**: Against main branch
9. **Code Review**: Address feedback
10. **Merge**: After approval

## Project Structure

Understanding the structure helps with contributions:

```
moulavi-erp/
├── backend/
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── database/    # DB schemas and migrations
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Helper functions
│   └── uploads/         # File uploads
├── frontend/
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   ├── lib/           # Utilities
│   └── public/        # Static assets
└── docs/              # Documentation
```

## Getting Help

- Review existing documentation
- Check closed issues for similar questions
- Ask in discussions section
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the project

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to NuSync! 🎉

