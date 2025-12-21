
import React from 'react';
import { ContentCalendarEntry } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ContentCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    entries: ContentCalendarEntry[];
}

const ContentCalendarModal: React.FC<ContentCalendarModalProps> = ({ isOpen, onClose, entries }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Content Calendar"
            description="View and manage your content publication schedule"
            maxWidth="max-w-4xl"
            footer={<Button onClick={onClose} variant="secondary">Close</Button>}
        >
            {entries.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No calendar entries available.</p>
            ) : (
                <p className="text-gray-400 text-center py-10">Calendar view not yet implemented.</p>
            )}
        </Modal>
    );
};

export default ContentCalendarModal;