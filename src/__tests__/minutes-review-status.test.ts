import { updateReviewStatusAfterApproval } from '@/lib/minutes-review-service';

describe('minutes review status transitions', () => {
  it('returns approved when all reviewers approved', () => {
    expect(updateReviewStatusAfterApproval('in_review', ['approved', 'approved'])).toBe('approved');
  });

  it('returns changes_requested when any reviewer requested changes', () => {
    expect(updateReviewStatusAfterApproval('in_review', ['approved', 'changes_requested'])).toBe('changes_requested');
  });

  it('keeps closed status', () => {
    expect(updateReviewStatusAfterApproval('closed', ['approved'])).toBe('closed');
  });
});
