import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Get GitHub username
    let githubUsername = ''
    try {
      const { stdout } = await execAsync('gh api user --jq \'.login\'')
      githubUsername = stdout.trim()
    } catch (error) {
      console.error('Failed to get GitHub username:', error)
    }

    // Get git config user.name and user.email
    let gitUserName = ''
    let gitUserEmail = ''
    try {
      const { stdout: nameStdout } = await execAsync('git config --global user.name')
      gitUserName = nameStdout.trim()
    } catch (error) {
      console.error('Failed to get git user.name:', error)
    }

    try {
      const { stdout: emailStdout } = await execAsync('git config --global user.email')
      gitUserEmail = emailStdout.trim()
    } catch (error) {
      console.error('Failed to get git user.email:', error)
    }

    return NextResponse.json({
      githubUsername,
      gitUserName,
      gitUserEmail
    })
  } catch (error) {
    console.error('Failed to get user info:', error)
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 })
  }
}
